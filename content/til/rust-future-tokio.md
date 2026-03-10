오늘은 간단하게 rust의 tokio의 기본 동작 방식과 `Future`에 대해 정리했다.  
기존 java에서의 비동기 시스템과 차원이 다르기 때문에.. 단숨에 이해하기에는 어려웠음.(고로 기록해두기)   

참고로 진짜 알바한다고 개피곤해서 좀 제정신 아니기도 함........   


---

Tokio 기준으로 다음과 같이 이해하면 된다. 

- async runtime worker thread는 기본적으로 대개 CPU 코어 수에 맞춰 잡는다.
- 이 워커 스레드들이 epoll/kqueue/io_uring 같은 OS I/O 이벤트와 future poll을 돌리면서 많은 커넥션을 multiplexing
- 그래서 커넥션 수만큼 스레드를 늘리지 않는다.

> epoll/kqueue/io_uring은 OS가 I/O 준비 상태를 알려주는 방식  
> future poll은 런타임이 Rust async 작업을 한 단계씩 진행시키는 방식

대략 다음과 같이 동작한다.

1. OS에 소켓 읽기/쓰기 가능 여부를 등록한다
2. epoll이나 kqueue 같은 메커니즘으로 "이 fd 이제 읽을 수 있음" 같은 이벤트를 받는다
3. 그 이벤트와 연결된 task를 깨운다
4. 런타임이 그 task의 Future::poll()을 다시 호출
5. poll() 결과가 Ready면 끝나고, 아직 못 끝내면 Pending을 반환하고 다시 잠듦

그래서 **OS 이벤트 시스템이 "이제 해볼 만함"을 알려주고** future poll이 **"진짜로 일을 한 스텝 진행"**

---

# Future poll

 ust의 Future는 "언젠가 결과를 만들 계산"이고, 핵심 메서드는 poll이다.

개념적으로는 이런 형태이다.

```rust
  trait Future {
      type Output;
      fn poll(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Self::Output>;
  }
```

반환값은 둘 중 하나.

- Poll::Ready(val): 끝남
- Poll::Pending: 아직 안 끝남. 나중에 다시 poll 해라

Rust async는 보통 커널이 future를 실행해주는 구조가 아니다. 런타임이 계속 적절한 시점에 poll()을 불러서 조금씩 전진시켜야함.

그래서 스스로 백그라운드에서 알아서 도는 스레드가 아니라 **poll 될때만 실행되는 상태머신**


async fn은 컴파일되면 내부적으로 이런 상태 머신으로 변환된다.

```rust
  async fn handle() {
      let a = read_socket().await;
      let b = process(a).await;
      write_socket(b).await;
  }
```

- 지금 어디까지 진행했는지
- 어떤 await에서 멈췄는지
- 다음에 poll되면 어디부터 재개할지

를 담은 enum/상태 머신 비슷한 구조로 변환된다.

### wake가 필요한 이유
poll()이 Pending을 반환할 때는 런타임에 이런 기능이 필요함

- 지금 못 끝내는 경우
- 나중에 진행 가능해지면 이 task를 깨워줘의 역할을 해야함

이때 사용하는게 **Waker**

흐름은 아래와 같다.

1. 런타임이 task를 poll()
2. future가 아직 I/O 준비 안 됨을 확인
3. future가 현재 task의 Waker를 어딘가 등록
4. Pending 반환
5. 나중에 epoll/kqueue/io_uring 이벤트가 도착
6. 런타임이 해당 task의 Waker를 통해 다시 runnable로 만듦
7. 스케줄러가 다시 poll()

### epoll과 future poll이 어떻게 이어지지

소켓 읽기를 예로 들면

1. task가 socket.read().await에 도달
2. 내부 future가 실제로 읽기를 시도
3. 소켓이 아직 읽기 불가면 WouldBlock
4. 그 future는 이 소켓에 대한 readable 이벤트를 런타임에 등록
5. 현재 task의 waker를 저장
6. Pending 반환
7. epoll/kqueue가 readable 이벤트 전달
8. 런타임이 해당 task를 깨움
9. task가 다시 poll됨
10. 이번엔 read가 성공하고 다음 await로 진행

> 중요한 점  
> 1. epoll은 task를 직접 알지 않는다  
> 2. 커널은 fd readiness만 안다
> 3. 런타임이 fd와 task를 연결해준다

대충 Netty와 비교하자면 Netty는 selector가 ready event 받아서 event loop가 핸들러를 호출하는데,  
tokio에서는 OS event 받고 해당 task깨우고 task의 future를 다시 poll 하는 구조

이렇게 하면 스레드를 커넥션마다 만들지 않음. `await` 지점에서만 중단되므로 문맥 전환 비용도 적고, 상태 머신으로 컴파일 되기 때문에 콜백 지옥이 없다.  

대신 poll안에서 오래걸리는 cpu작업을 하면 안된다. 블로킹 syscall/락 대기/긴 계산을 worker thread에서 하면 전체 런타임이 막힘 ㅇㅇ.  
future는 cooperative scheduling이라 스스로 자주 제어를 넘겨야 함..

---

# 컨텍스트 스위칭과 유사한가?
직관적으로는 유사함. 근데 그것보다 훨씬 가볍다.  
실행중이던 진짜 CPU 문맥을 통째로 넘겨야 하는데, 이건 무겁고 커널 개입이 들어감.  

Rust Future 상태머신의 경우, 컴파일러와 런타임 레벨이라 
- `async fn` 안의 지역 변수
- 어느 `await` 지점까지 왔는지
- 다음 `poll` 때 어떤 분기부터 재개할지

에 대한 상태만 저장하는 것이다. 
걍 간단하게 **함수 실행 진행 상태 저장** 이라고 생각하자..

예를 들어
```rust
  async fn foo() {
      let a = read().await;
      let b = work(a).await;
      println!("{b}");
  }
```
컴파일 후 개념적으로는 아래와 같은 느낌
```rust
  enum FooFuture {
      Start,
      WaitingRead { ... },
      WaitingWork { a: ..., ... },
      Done,
  }
```
즉 스택 전체를 저장하는 게 아니라,
필요한 변수 + 현재 단계만 구조체/enum처럼 들고 있는 ddd

---

# 컴파일러 개입 시점
컴파일러는 런타임에 개입하지 않는다. 당연한 말이지만..  
정확히는 컴파일 시점에 async 코드를 Future 상태 머신으로 변환해두는 것이다. 
그래서 런타임 때는 그 변환된 객체가 그냥 일반 값처럼 생성되고 움직임

**future가 발생하는 시점은 보통 async fn을 호출했을 때**

```rust
  async fn foo() -> i32 {
      42
  }
```

이런게 개념적으로 아래와 같이 변환됨

```rust
  fn foo() -> impl Future<Output = i32> {
      FooFuture { state: Start }
  }
```

컴파일 후에는 Future를 구현한 익명 타입을 반환하는 함수가 되는 것(와 코드젠)

관여 방식은 다음과 같다.

1. async fn 본문을 분석
2. await 지점 기준으로 중단 가능한 상태를 나눔
3. 지역 변수와 다음 재개 위치를 담는 상태 머신 타입 생성
4. 그 타입에 Future::poll() 구현 생성

사실상 future를 생성하는 코드로 바꿔치기 하는 것

---

진짜 너무 피곤해서 우선은 줄이고..... 나중에 다른 포스트로 보충하거나 해당 글을 수정하도록 하자

