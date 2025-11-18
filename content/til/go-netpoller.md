> Go의 netpoller는 epoll 기반 event driver인데 구조가 깔끔한 것 같아서, 추후 진행할 런타임 프로젝트에서 참고해볼 예정임. 해당 소스코드를 참고하려 하는데, 해당 부분만 한글로 번역해둠. 나중에 다시 읽을 것 같아서

# 소스 코드 번역

[소스 코드 바로가기](https://github.com/golang/go/blob/master/src/runtime/netpoll.go)

```go
// Copyright 2013 The Go Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

//go:build unix || (js && wasm) || wasip1 || windows
package runtime

import (
	"internal/runtime/atomic"
	"internal/runtime/sys"
	"unsafe"
)

// 통합형 네트워크 폴러 (플랫폼 독립적인 부분)
// 각 플랫폼별 구현(epoll/kqueue/port/AIX/Windows)은 다음 함수들을 반드시 정의해야 합니다:
//
// func netpollinit()
// 폴러를 초기화합니다. 딱 한 번만 호출됩니다.
//
// func netpollopen(fd uintptr, pd *pollDesc) int32
// fd에 대해 엣지 트리거(edge-triggered) 알림을 활성화합니다.
// 준비가 되었을 때 netpollready에 다시 전달하기 위해 pd를 사용합니다.
// errno 값을 반환합니다.
//
// func netpollclose(fd uintptr) int32
// fd에 대한 알림을 비활성화합니다. errno 값을 반환합니다.
//
// func netpoll(delta int64) (gList, int32)
// 네트워크를 폴링합니다.
// delta < 0이면 무한 대기,
// delta == 0이면 블록하지 않고 폴링,
// delta > 0이면 최대 delta 나노초 동안 블록합니다.
// netpollready를 호출해서 만든 고루틴 리스트와,
// 모든 고루틴이 준비되면 netpollWaiters에 더해줄 delta 값을 반환합니다.
// 절대 빈 리스트와 함께 0이 아닌 delta를 반환해서는 안 됩니다.
//
// func netpollBreak()
// 네트워크 폴러를 깨웁니다. netpoll에서 블록돼 있다고 가정합니다.
//
// func netpollIsPollDescriptor(fd uintptr) bool
// fd가 폴러가 사용하는 파일 디스크립터인지 확인합니다.

// runtime_pollReset과 runtime_pollWait이 반환하는 에러 코드들
// internal/poll/fd_poll_runtime.go의 값과 일치해야 합니다.
const (
	pollNoError        = 0 // 에러 없음
	pollErrClosing     = 1 // 디스크립터가 닫히는 중
	pollErrTimeout     = 2 // I/O 타임아웃
	pollErrNotPollable = 3 // 디스크립터를 폴링할 수 없는 일반적인 오류
)

// pollDesc는 읽기/쓰기 고루틴을 파킹(parking)하기 위한 2개의 바이너리 세마포어 rg, wg를 포함합니다.
// 세마포어는 다음 상태들 중 하나일 수 있습니다:
//
// pdReady      – I/O 준비 완료 알림이 대기 중
//                고루틴이 알림을 소비하면 pdNil로 바꿈
// pdWait       – 고루틴이 파킹 준비 중이지만 아직 파킹되지 않음
//                파킹을 확정하거나, 동시에 I/O 알림이 오거나, 타임아웃/닫힘이 발생
// G 포인터     – 고루틴이 세마포어에 블록된 상태
//                I/O 알림이나 타임아웃/닫힘이 pdReady 또는 pdNil로 바꾸고 언파크
// pdNil        – 위의 어느 것도 아님
const (
	pdNil   uintptr = 0
	pdReady uintptr = 1
	pdWait  uintptr = 2
)

const pollBlockSize = 4 * 1024

// 네트워크 폴러 디스크립터
// 힙 포인터를 가지지 않습니다.
type pollDesc struct {
	_ sys.NotInHeap
	link *pollDesc // pollcache 안에서 사용, pollcache.lock으로 보호

	fd    uintptr           // pollDesc 생애주기 동안 고정
	fdseq atomic.Uintptr    // 오래된 pollDesc 방지용

	// atomicInfo는 closing, rd, wd 등의 비트를 모아놓은 것
	// lock을 잡지 않고 netpollcheckerr에서 사용할 수 있게 함
	// lock 아래에서 이 필드들을 바꾼 뒤 publishInfo를 반드시 호출해야 함
	atomicInfo atomic.Uint32 // atomic pollInfo

	// rg, wg는 원자적으로 접근되며 G 포인터를 가짐
	rg atomic.Uintptr // pdReady, pdWait, 읽기를 기다리는 G, 또는 pdNil
	wg atomic.Uintptr // pdReady, pdWait, 쓰기를 기다리는 G, 또는 pdNil

	lock mutex // 아래 필드들을 보호

	closing bool
	rrun    bool // 읽기 타이머가 동작 중인지
	wrun    bool // 쓰기 타이머가 동작 중인지
	user    uint32 // 사용자가 설정 가능한 쿠키

	rseq uintptr   // 오래된 읽기 타이머 방지
	rt   timer    // 읽기 데드라인 타이머
	rd   int64     // 읽기 데드라인 (미래 나노타임, 만료 시 -1)

	wseq uintptr   // 오래된 쓰기 타이머 방지
	wt   timer    // 쓰기 데드라인 타이머
	wd   int64     // 쓰기 데드라인 (미래 나노타임, 만료 시 -1)

	self *pollDesc // 간접 interface를 위한 저장소. (*pollDesc).makeArg 참고
}

// pollInfo는 netpollcheckerr에서 필요로 하는 비트들을 원자적으로 저장
// 대부분 pollDesc의 lock 아래 상태를 복제한 것임
// 단, pollEventErr 비트는 여기서만 관리됨
type pollInfo uint32

const (
	pollClosing             = 1 << iota
	pollEventErr                     // epoll/kqueue 등에서 이벤트 스캔 중 오류 발생
	pollExpiredReadDeadline
	pollExpiredWriteDeadline
	pollFDSeq // fdseq의 하위 20비트
)

const (
	pollFDSeqBits = 20
	pollFDSeqMask = 1<<pollFDSeqBits - 1
)

func (i pollInfo) closing() bool                 { return i&pollClosing != 0 }
func (i pollInfo) eventErr() bool                { return i&pollEventErr != 0 }
func (i pollInfo) expiredReadDeadline() bool     { return i&pollExpiredReadDeadline != 0 }
func (i pollInfo) expiredWriteDeadline() bool    { return i&pollExpiredWriteDeadline != 0 }

// pd의 현재 pollInfo를 반환
func (pd *pollDesc) info() pollInfo {
	return pollInfo(pd.atomicInfo.Load())
}

// pd.lock을 잡은 상태에서만 호출해야 함
// closing, rd, wd 등을 바꾼 뒤 반드시 호출해서 atomicInfo를 갱신
func (pd *pollDesc) publishInfo() {
	var info uint32
	if pd.closing {
		info |= pollClosing
	}
	if pd.rd < 0 {
		info |= pollExpiredReadDeadline
	}
	if pd.wd < 0 {
		info |= pollExpiredWriteDeadline
	}
	info |= uint32(pd.fdseq.Load()&pollFDSeqMask) << pollFDSeq

	// pollEventErr 비트를 제외한 나머지를 갱신
	x := pd.atomicInfo.Load()
	for !pd.atomicInfo.CompareAndSwap(x, (x&pollEventErr)|info) {
		x = pd.atomicInfo.Load()
	}
}

// pollEventErr 비트를 설정/해제
// seq가 0이거나 현재 pollFDSeq와 일치할 때만 변경 (issue #59545)
func (pd *pollDesc) setEventErr(b bool, seq uintptr) {
	mSeq := uint32(seq & pollFDSeqMask)
	x := pd.atomicInfo.Load()
	xSeq := (x >> pollFDSeq) & pollFDSeqMask
	if seq != 0 && xSeq != mSeq {
		return
	}
	for (x&pollEventErr != 0) != b && !pd.atomicInfo.CompareAndSwap(x, x^pollEventErr) {
		x = pd.atomicInfo.Load()
		xSeq := (x >> pollFDSeq) & pollFDSeqMask
		if seq != 0 && xSeq != mSeq {
			return
		}
	}
}

type pollCache struct {
	lock  mutex
	first *pollDesc
	// pollDesc는 타입 안정성이 보장되어야 함
	// fd가 닫히고 재사용된 뒤에도 epoll/kqueue에서 알림이 올 수 있기 때문
	// 오래된 알림은 seq 값을 통해 감지
}

var (
	netpollInitLock mutex
	netpollInited   atomic.Uint32
	pollcache       pollCache
	netpollWaiters  atomic.Uint32 // 현재 네트워크 폴러를 기다리는 고루틴 수
)

// netpollWaiters는 테스트에서도 접근함
//go:linkname netpollWaiters
//go:linkname poll_runtime_pollServerInit internal/poll.runtime_pollServerInit
func poll_runtime_pollServerInit() {
	netpollGenericInit()
}

// 공통 초기화 (epoll/kqueue 등 실제 구현 전에 호출)
func netpollGenericInit() {
	if netpollInited.Load() == 0 {
		lockInit(&netpollInitLock, lockRankNetpollInit)
		lockInit(&pollcache.lock, lockRankPollCache)
		lock(&netpollInitLock)
		if netpollInited.Load() == 0 {
			netpollinit() // 플랫폼별 초기화 (epoll_create 등)
			netpollInited.Store(1)
		}
		unlock(&netpollInitLock)
	}
}

func netpollinited() bool {
	return netpollInited.Load() != 0
}

//go:linkname poll_runtime_isPollServerDescriptor internal/poll.runtime_isPollServerDescriptor
func poll_runtime_isPollServerDescriptor(fd uintptr) bool {
	return netpollIsPollServerDescriptor(fd)
}

// 새 파일 디스크립터를 폴링 가능하게 만듦
//go:linkname poll_runtime_pollOpen internal/poll.runtime_pollOpen
func poll_runtime_pollOpen(fd uintptr) (*pollDesc, int) {
	pd := pollcache.alloc()
	lock(&pd.lock)

	// 이미 블록된 고루틴이 있으면 안 됨
	if wg := pd.wg.Load(); wg != pdNil && wg != pdReady {
		throw("runtime: blocked write on free polldesc")
	}
	if rg := pd.rg.Load(); rg != pdNil && rg != pdReady {
		throw("runtime: blocked read on free polldesc")
	}

	pd.fd = fd
	if pd.fdseq.Load() == 0 {
		pd.fdseq.Store(1) // 0은 특수값이므로 사용하지 않음
	}
	pd.closing = false
	pd.setEventErr(false, 0)
	pd.rseq++
	pd.rg.Store(pdNil)
	pd.rd = 0
	pd.wseq++
	pd.wg.Store(pdNil)
	pd.wd = 0
	pd.self = pd
	pd.publishInfo()
	unlock(&pd.lock)

	if errno := netpollopen(fd, pd); errno != 0 {
		pollcache.free(pd)
		return nil, int(errno)
	}
	return pd, 0
}

// 폴링 디스크립터 닫기
//go:linkname poll_runtime_pollClose internal/poll.runtime_pollClose
func poll_runtime_pollClose(pd *pollDesc) {
	if !pd.closing {
		throw("runtime: close polldesc w/o unblock")
	}
	if wg := pd.wg.Load(); wg != pdNil && wg != pdReady {
		throw("runtime: blocked write on closing polldesc")
	}
	if rg := pd.rg.Load(); rg != pdNil && rg != pdReady {
		throw("runtime: blocked read on closing polldesc")
	}
	netpollclose(pd.fd)
	pollcache.free(pd)
}

// pollCache에서 해제된 pollDesc를 재활용 가능한 풀에 돌려놓음
func (c *pollCache) free(pd *pollDesc) {
	lock(&pd.lock)
	// 현재 실행 중인 netpoll이 이 pd를 ready로 표시하지 못하게 seq 증가
	fdseq := pd.fdseq.Load()
	fdseq = (fdseq + 1) & (1<<tagBits - 1)
	pd.fdseq.Store(fdseq)
	pd.publishInfo()
	unlock(&pd.lock)

	lock(&c.lock)
	pd.link = c.first
	c.first = pd
	unlock(&c.lock)
}

// 읽기/쓰기 폴링 준비 (세마포어 초기화)
//go:linkname poll_runtime_pollReset internal/poll.runtime_pollReset
func poll_runtime_pollReset(pd *pollDesc, mode int) int {
	if errcode := netpollcheckerr(pd, int32(mode)); errcode != pollNoError {
		return errcode
	}
	if mode == 'r' {
		pd.rg.Store(pdNil)
	} else {
		pd.wg.Store(pdNil)
	}
	return pollNoError
}

// 실제 I/O 대기
//go:linkname poll_runtime_pollWait internal/poll.runtime_pollWait
func poll_runtime_pollWait(pd *pollDesc, mode int) int {
	if errcode := netpollcheckerr(pd, int32(mode)); errcode != pollNoError {
		return errcode
	}
	// 레벨 트리거 플랫폼은 매번 arm 필요
	if GOOS == "solaris" || GOOS == "illumos" || GOOS == "aix" || GOOS == "wasip1" {
		netpollarm(pd, mode)
	}
	for !netpollblock(pd, int32(mode), false) {
		if errcode := netpollcheckerr(pd, int32(mode)); errcode != pollNoError {
			return errcode
		}
	}
	return pollNoError
}

// Windows에서 비동기 I/O 취소 실패 후 호출됨
//go:linkname poll_runtime_pollWaitCanceled internal/poll.runtime_pollWaitCanceled
func poll_runtime_pollWaitCanceled(pd *pollDesc, mode int) {
	for !netpollblock(pd, int32(mode), true) {
	}
}

// 데드라인 설정 (절대시간 나노초, 0 = 무한, 음수 = 즉시 타임아웃)
//go:linkname poll_runtime_pollSetDeadline internal/poll.runtime_pollSetDeadline
func poll_runtime_pollSetDeadline(pd *pollDesc, d int64, mode int) {
	lock(&pd.lock)
	if pd.closing {
		unlock(&pd.lock)
		return
	}
	// 기존 값 백업 (타이머 재설정 여부 판단용)
	rd0, wd0 := pd.rd, pd.wd
	combo0 := rd0 > 0 && rd0 == wd0

	if d > 0 {
		d += nanotime()
		if d <= 0 { // 오버플로우 방지
			d = 1<<63 - 1
		}
	}

	if mode == 'r' || mode == 'r'+'w' {
		pd.rd = d
	}
	if mode == 'w' || mode == 'r'+'w' {
		pd.wd = d
	}
	pd.publishInfo()

	// 읽기/쓰기 데드라인이 같으면 하나의 타이머로 처리
	combo := pd.rd > 0 && pd.rd == pd.wd
	rtf := netpollReadDeadline
	if combo {
		rtf = netpollDeadline
	}

	// 읽기 타이머 관리
	if !pd.rrun {
		if pd.rd > 0 {
			pd.rt.modify(pd.rd, 0, rtf, pd.makeArg(), pd.rseq)
			pd.rrun = true
		}
	} else if pd.rd != rd0 || combo != combo0 {
		pd.rseq++ // 기존 타이머 무효화
		if pd.rd > 0 {
			pd.rt.modify(pd.rd, 0, rtf, pd.makeArg(), pd.rseq)
		} else {
			pd.rt.stop()
			pd.rrun = false
		}
	}

	// 쓰기 타이머 관리 (공용 타이머면 생략)
	if !pd.wrun {
		if pd.wd > 0 && !combo {
			pd.wt.modify(pd.wd, 0, netpollWriteDeadline, pd.makeArg(), pd.wseq)
			pd.wrun = true
		}
	} else if pd.wd != wd0 || combo != combo0 {
		pd.wseq++
		if pd.wd > 0 && !combo {
			pd.wt.modify(pd.wd, 0, netpollWriteDeadline, pd.makeArg(), pd.wseq)
		} else {
			pd.wt.stop()
			pd.wrun = false
		}
	}

	// 데드라인이 이미 지났다면 블록된 고루틴 즉시 깨우기
	delta := int32(0)
	var rg, wg *g
	if pd.rd < 0 {
		rg = netpollunblock(pd, 'r', false, &delta)
	}
	if pd.wd < 0 {
		wg = netpollunblock(pd, 'w', false, &delta)
	}
	unlock(&pd.lock)

	if rg != nil {
		netpollgoready(rg, 3)
	}
	if wg != nil {
		netpollgoready(wg, 3)
	}
	netpollAdjustWaiters(delta)
}

// 디스크립터 완전 닫기 (internal/poll.CloseFunc 호출 시)
//go:linkname poll_runtime_pollUnblock internal/poll.runtime_pollUnblock
func poll_runtime_pollUnblock(pd *pollDesc) {
	lock(&pd.lock)
	if pd.closing {
		throw("runtime: unblock on closing polldesc")
	}
	pd.closing = true
	pd.rseq++
	pd.wseq++

	delta := int32(0)
	rg := netpollunblock(pd, 'r', false, &delta)
	wg := netpollunblock(pd, 'w', false, &delta)

	if pd.rrun {
		pd.rt.stop()
		pd.rrun = false
	}
	if pd.wrun {
		pd.wt.stop()
		pd.wrun = false
	}
	unlock(&pd.lock)

	if rg != nil {
		netpollgoready(rg, 3)
	}
	if wg != nil {
		netpollgoready(wg, 3)
	}
	netpollAdjustWaiters(delta)
}

// 플랫폼별 netpoll 함수가 fd가 준비됐음을 알릴 때 호출
// 준비된 고루틴들을 toRun 리스트에 넣고, netpollWaiters 조정값 반환
// 세계가 멈춘 상태에서도 실행될 수 있으므로 write barrier 금지
//go:nowritebarrier
func netpollready(toRun *gList, pd *pollDesc, mode int32) int32 {
	delta := int32(0)
	var rg, wg *g
	if mode == 'r' || mode == 'r'+'w' {
		rg = netpollunblock(pd, 'r', true, &delta)
	}
	if mode == 'w' || mode == 'r'+'w' {
		wg = netpollunblock(pd, 'w', true, &delta)
	}
	if rg != nil {
		toRun.push(rg)
	}
	if wg != nil {
		toRun.push(wg)
	}
	return delta
}

// 에러 상태를 빠르게 검사 (lock 없이)
func netpollcheckerr(pd *pollDesc, mode int32) int {
	info := pd.info()
	if info.closing() {
		return pollErrClosing
	}
	if (mode == 'r' && info.expiredReadDeadline()) || (mode == 'w' && info.expiredWriteDeadline()) {
		return pollErrTimeout
	}
	if mode == 'r' && info.eventErr() {
		return pollErrNotPollable
	}
	return pollNoError
}

// 고루틴을 실제로 파킹하기 직전에 호출되는 콜백
func netpollblockcommit(gp *g, gpp unsafe.Pointer) bool {
	r := atomic.Casuintptr((*uintptr)(gpp), pdWait, uintptr(unsafe.Pointer(gp)))
	if r {
		netpollAdjustWaiters(1) // 폴러를 기다리는 고루틴 수 증가
	}
	return r
}

func netpollgoready(gp *g, traceskip int) {
	goready(gp, traceskip+1)
}

// 실제로 고루틴을 파킹하고 I/O가 준비될 때까지 대기
// waitio == true면 타임아웃/닫힘 무시하고 I/O 완료만 기다림 (Windows 전용)
func netpollblock(pd *pollDesc, mode int32, waitio bool) bool {
	gpp := &pd.rg
	if mode == 'w' {
		gpp = &pd.wg
	}

	for {
		// 이미 준비됐으면 바로 반환
		if gpp.CompareAndSwap(pdReady, pdNil) {
			return true
		}
		// pdWait으로 설정 시도
		if gpp.CompareAndSwap(pdNil, pdWait) {
			break
		}
		if v := gpp.Load(); v != pdReady && v != pdNil {
			throw("runtime: double wait")
		}
	}

	// pdWait으로 바꾼 뒤 다시 한 번 에러 상태 확인
	if waitio || netpollcheckerr(pd, mode) == pollNoError {
		gopark(netpollblockcommit, unsafe.Pointer(gpp), waitReasonIOWait, traceBlockNet, 5)
	}

	// 깨어난 뒤 상태 정리
	old := gpp.Swap(pdNil)
	if old > pdWait {
		throw("runtime: corrupted polldesc")
	}
	return old == pdReady
}

// rg 또는 wg를 pdReady 상태로 만들고, 블록돼 있던 고루틴을 반환
func netpollunblock(pd *pollDesc, mode int32, ioready bool, delta *int32) *g {
	gpp := &pd.rg
	if mode == 'w' {
		gpp = &pd.wg
	}
	for {
		old := gpp.Load()
		if old == pdReady {
			return nil
		}
		if old == pdNil && !ioready {
			return nil
		}
		new := pdNil
		if ioready {
			new = pdReady
		}
		if gpp.CompareAndSwap(old, new) {
			if old == pdWait {
				old = pdNil
			} else if old != pdNil {
				*delta -= 1
			}
			return (*g)(unsafe.Pointer(old))
		}
	}
}

// 타이머 만료 시 호출되는 공통 로직
func netpolldeadlineimpl(pd *pollDesc, seq uintptr, read, write bool) {
	lock(&pd.lock)
	currentSeq := pd.rseq
	if !read {
		currentSeq = pd.wseq
	}
	if seq != currentSeq { // 디스크립터 재사용 또는 타이머 리셋된 경우
		unlock(&pd.lock)
		return
	}

	delta := int32(0)
	var rg, wg *g
	if read {
		pd.rd = -1
		pd.publishInfo()
		rg = netpollunblock(pd, 'r', false, &delta)
	}
	if write {
		pd.wd = -1
		pd.publishInfo()
		wg = netpollunblock(pd, 'w', false, &delta)
	}
	unlock(&pd.lock)

	if rg != nil {
		netpollgoready(rg, 0)
	}
	if wg != nil {
		netpollgoready(wg, 0)
	}
	netpollAdjustWaiters(delta)
}

func netpollDeadline(arg any, seq uintptr, delta int64) {
	netpolldeadlineimpl(arg.(*pollDesc), seq, true, true)
}
func netpollReadDeadline(arg any, seq uintptr, delta int64) {
	netpolldeadlineimpl(arg.(*pollDesc), seq, true, false)
}
func netpollWriteDeadline(arg any, seq uintptr, delta int64) {
	netpolldeadlineimpl(arg.(*pollDesc), seq, false, true)
}

func netpollAnyWaiters() bool {
	return netpollWaiters.Load() > 0
}

func netpollAdjustWaiters(delta int32) {
	if delta != 0 {
		netpollWaiters.Add(delta)
	}
}

// pollDesc 풀에서 하나 할당
func (c *pollCache) alloc() *pollDesc {
	// ... (기존 코드 그대로, 주석 생략)
}

// pollDesc를 interface{}로 변환 (힙 할당 없이)
// NotInHeap 타입 때문에 일반 변환은 힙 할당이 필요 → 직접 우회
func (pd *pollDesc) makeArg() (i any) {
	x := (*eface)(unsafe.Pointer(&i))
	x._type = pdType
	x.data = unsafe.Pointer(&pd.self)
	return
}

var (
	pdEface any = (*pollDesc)(nil)
	pdType  *_type = efaceOf(&pdEface)._type
)
```

# 전반적인 작동 원리
Go는 네트워크 I/O를 할 때 고루틴을 OS 스레드에 묶지 않고, 하나의 전용 “netpoller 스레드”가 epoll_wait()를 돌리면서 수만 개의 소켓을 감시하고, 이벤트가 발생하면 해당 고루틴을 스케줄러에 바로 깨워서 다시 실행시키는 구조이다.

내가 파악한 다른 비동기 런타임과 대부분 동일하고 추가적으로 Work-Stealing + Task Affinity 이 극단적으로 최적화 되어있는 듯 하다. Go에서 공식적으로는 "runnext (P.runnext) + netpoll fast-fail" 이라고 부름. 

#### 굳이 그렇게 하는 이유
- 네트워크 I/O가 발생한 순간에 그 소켓의 모든 상태(버퍼, TLS state, HTTP parser 상태 등)가 아마도 방금 그 P(스레드)의 L3/L2 캐시에 있을 확률이 극히 높음
- 그래서 깨어난 고루틴/태스크를 무조건 그 스레드에서 바로 실행시키면? 캐시 히트율 90% 이상, latency가 5~10배 낮아짐
- 이걸 "Wake-up Affinity" 또는 "Cache Affinity Optimization" 라고도 부름

극단적이라 한 이유는, 보통 다른 언어(Rust async-std, .NET, C++ folly) 같은데에서 같은 로컬 큐를 사용하되, 최적화를 진행했다면, 큐의 맨앞으로 꽂아주는게 보통 일반적 기법들인데 Go에서는 걍 로컬 큐도 안 거치고 runnext 1자리 특급석을 만들어서 가장 먼저 실행되게 해둠. 그래서 실측에서는 Rust Tokio보다 더 좋게 나온다.

## 핵심 구성 요소 4가지
| 요소 | 역할 |
| --- | --- |
| pollDesc | 하나의 fd(소켓)에 붙는 작은 상태 머신. 읽기/쓰기 각각 하나의 고루틴만 대기 가능 |
| netpoller 스레드 | sysmon 스레드 안에서 주기적으로 netpoll(delta)를 호출 -> epoll_wait() 실제 수행 |
| rg / wg | pollDesc 안에 있는 3-state 세마포어 (pdNil ↔ pdWait ↔ G 포인터 ↔ pdReady) |
| pollCache | 수천 개의 pollDesc를 미리 할당해 놓는 오브젝트 풀 (GC 대상 아님) |

## 실제 실행 흐름
```plain
1. net.Conn의 내부 fd가 pollDesc를 처음 만들거나 재사용
   → runtime.poll_runtime_pollOpen(fd) → netpollopen(fd, pd)   // epoll_ctl(ADD)

2. Read() 호출 → 내부에서 runtime.poll_runtime_pollWait(pd, 'r')
   → netpollblock(pd, 'r') 실행

3. netpollblock() 동작 (핵심 로직)
   rg 원자적으로 pdNil → pdWait 로 바꿈
   → gopark()로 현재 고루틴을 재움 (park)
   → netpollWaiters 카운터 +1

4. 백그라운드에서 netpoller 스레드가 주기적으로 netpoll(-1)을 호출
   → Linux에서는 runtime.netpoll_epoll.go의 netpoll() 함수가
      epoll_wait() → 이벤트 발생 → netpollready() 호출

5. netpollready() (플랫폼별에서 호출됨)
   → netpollunblock(pd, 'r', true) 실행
   → rg를 pdReady로 바꾸고, 전에 park된 G를 꺼내 toRun 리스트에 넣음
   → netpollWaiters 카운터 -1

6. netpoll() 함수가 끝나면 toRun에 들어있는 모든 고루틴을
   → netpollgoready() → goready() → 스케줄러 runqueue에 넣음

7. 스케줄러가 그 고루틴을 다시 실행 → Read() 호출이 성공적으로 리턴
```

## 주요 함수 정리표
| 함수 (링크명 포함) | 언제 호출되는가 | 핵심 역할 (한 줄 요약) |
| --- | --- | --- |
| poll_runtime_pollOpen | netFD 생성 직후 (Accept, Dial, Listen 등) | pollDesc 할당 + netpollopen(fd, pd) → epoll_ctl(ADD) |
| poll_runtime_pollReset | Read/Write 호출 직전 | rg/wg를 pdNil로 초기화 (이전 알림 소비) |
| poll_runtime_pollWait | 실제 Read/Write에서 블로킹될 때 | netpollblock() 호출 → 고루틴 park + netpollWaiters++ |
| netpollblock(pd, mode) | pollWait 안에서 | rg/wg를 pdWait로 바꾸고 gopark → 진짜 재움 |
| netpoll (플랫폼별, 예: netpoll_epoll.go) | sysmon 스레드가 10ms~20ms마다 호출 | epoll_wait() → 이벤트 있으면 netpollready() 호출 |
| netpollready(toRun, pd, mode) | epoll/kqueue 등에서 이벤트 발생 즉시 | netpollunblock() → park된 고루틴 꺼내 toRun에 넣고 netpollWaiters-- |
| netpollunblock(pd, mode, ioready) | netpollready, 타임아웃, Close 등에서 | rg/wg를 pdReady로 바꾸고 대기 중이던 G 반환 |
| netpollgoready(gp) | netpoll() 함수 끝나기 직전 | goready() → 스케줄러 runqueue에 넣어서 바로 실행되게 함 |
| poll_runtime_pollSetDeadline | SetReadDeadline, SetWriteDeadline 호출 시 | 타이머 등록/수정 → 만료 시 netpollunblock 호출해서 타임아웃 처리 |
| poll_runtime_pollUnblock | fd.Close() 호출 시 | closing = true + 타이머 정지 + netpollunblock으로 대기 고루틴 모두 깨움 |
| netpollcheckerr | pollReset / pollWait 시작할 때마다 | closing, timeout, 이벤트 오류 있으면 즉시 pollErrXXX 반환 (lock 없이 빠르게 체크) |

## 특이한 점 3가지 (다른 언어와 차별점)
| 특징 | 설명 |
| --- | --- |
| 고루틴 1개당 pollDesc 1개 | 읽기용 1개, 쓰기용 1개 세마포어만 있음 → 동시에 같은 fd에서 Read와 Write를 기다릴 수 있음 |
| 엣지 트리거 + 수동 arm | Linux는 엣지 트리거이나, 레벨 트리거 플랫폼(Solaris 등)은 pollWait마다 netpollarm 호출 |
| 타임아웃은 런타임 타이머 사용 | time.Timer가 아니라 runtime timer 사용 → world stopped 상태에서도 동작 (netpollready에서 깨움) |

