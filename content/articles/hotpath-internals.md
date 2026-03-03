가벼운 마음으로 만든 프로젝트 `hotpath`의 내부 구조에 대한 설명 글이다.

## 개요

Hotpath는 JVM이 기록한 `.jfr` 파일을 읽어 CPU, GC, 메모리 할당, 스레드 경합 상태를 분석하고, 브라우저에서 바로 열 수 있는 단일 HTML 파일로 출력하는 CLI 도구다.

핵심 설계 원칙은 세 가지다.

1. **단일 패스** — JFR 파일을 처음부터 끝까지 한 번만 읽는다. 이벤트를 전부 메모리에 올리지 않고, 각 핸들러가 집계 상태만 유지한다.
2. **데이터·뷰 분리** — Java 코드는 JSON 직렬화까지만 담당한다. 차트 렌더링은 브라우저의 Plotly.js가 처리한다.
3. **외부 의존성 최소화** — JFR 파싱에 JDK 내장 API(`jdk.jfr.consumer`)를 사용하므로 별도 파서 라이브러리가 필요 없다.

---

## 개발 목적

- `.jfr`을 분석하는 대표적 도구인 JMC는 아주 훌륭한 도구이지만 리포트의 형태로서 제출 할 만한 형태는 아님.
- 벤치마크 도구 리포트들은 내용이 자세한 만큼 방대해서 **한눈에 확인**하기에는 무리가 있다.
- 깃에 올려서 확인하기에도 너무 내용이 크고 복잡함.
- 가벼운 만큼 내용이 적지만 대표적 수치만 빠르게 훑고 전후 차이를 쉽게 확인할 수 있도록

추후에 프로젝트를 또 만든다면 그때 분석 리포트로 사용해볼 생각임


> 다만 현재 글의 목적은 추후에 프로젝트를 확장할 경우 더 쉽게 파악하기 위한 구조 문서화. 

---

## 전체 파이프라인

```plain
.jfr 파일
    │
    ▼  [1단계] JfrReader
    RecordingFile.readEvent() 루프
    EventRouter → 타입별 핸들러 분기
    │
    ├── MetaHandler    (jdk.JVMInformation)
    ├── CpuHandler     (jdk.CPULoad, jdk.ExecutionSample)
    ├── GcHandler      (jdk.GarbageCollection, jdk.GCHeapSummary)
    ├── MemoryHandler  (jdk.GCHeapSummary, jdk.ObjectAllocation*)
    └── ThreadHandler  (jdk.JavaMonitorEnter, jdk.JavaThreadStatistics)
    │
    ▼  [2단계] Analyzers
    CpuAnalyzer    → CpuSummary    + List<Finding>
    GcAnalyzer     → GcSummary     + List<Finding>
    MemoryAnalyzer → MemorySummary + List<Finding>
    ThreadAnalyzer → ThreadSummary + List<Finding>
    │
    ▼  [3단계] TimelineBuilder
    raw 샘플 → 1초 단위 TimeBucket 목록
    │
    ▼  [4단계] HtmlRenderer
    AnalysisResult → Jackson → JSON
    template.replace("/*__HOTPATH_DATA__*/", json)
    │
    ▼
report.html
```

---

## 1단계 — JFR 파싱

### RecordingFile 스트리밍

JFR 파일은 JDK 내장 `jdk.jfr.consumer.RecordingFile`로 파싱한다.

```java
try (RecordingFile rf = new RecordingFile(jfrPath)) {
    while (rf.hasMoreEvents()) {
        RecordedEvent event = rf.readEvent();
        router.dispatch(event);
    }
}
```

`hasMoreEvents()` / `readEvent()` 루프는 이벤트를 하나씩 스트리밍한다. 파일 전체를 메모리에 올리지 않아 수백 MB 파일도 안정적으로 처리된다. 루프를 돌면서 첫 번째와 마지막 이벤트의 타임스탬프를 기록해 녹화 구간(`recordingStart`, `recordingEnd`)을 결정한다.

### EventRouter — 이벤트 분기

```java
// 등록: 이벤트 타입 이름 → 핸들러 목록
Map<String, List<EventHandler>> routes = new HashMap<>();

public void dispatch(RecordedEvent event) {
    List<EventHandler> handlers = routes.get(event.getEventType().getName());
    if (handlers != null) {
        for (EventHandler h : handlers) h.handle(event);
    }
}
```

`EventRouter`는 이벤트 타입 이름을 키로 핸들러 목록을 관리한다. 하나의 이벤트 타입에 여러 핸들러를 등록할 수 있다. `jdk.GCHeapSummary`는 GcHandler와 MemoryHandler 둘 다 구독하는데, GcHandler는 gcId별 힙 전후를 추적하고 MemoryHandler는 힙 사용 타임라인을 기록하기 때문이다.

### 핸들러별 수집 로직

#### MetaHandler

`jdk.JVMInformation` 이벤트를 받아 JVM 버전, JVM 인수, 메인 클래스, PID를 추출한다. JFR 필드 접근 시 `event.getValue()`가 내부적으로 char 배열 캐스팅에 실패하는 경우가 있어 타입 지정 accessor인 `event.getString(field)`를 사용하고 예외 시 빈 문자열로 폴백한다.

#### CpuHandler

두 종류의 이벤트를 처리한다.

**jdk.CPULoad** — JFR이 주기적으로(기본 1초) 기록하는 CPU 사용률 스냅샷이다. `jvmUser`와 `jvmSystem` 필드를 `getFloat()`로 읽어 타임스탬프와 함께 `CpuSample` 목록에 추가한다.

```plain
jdk.CPULoad
  └── jvmUser   (float, 0.0~1.0)  JVM 프로세스의 유저 스페이스 CPU 사용률
  └── jvmSystem (float, 0.0~1.0)  JVM 프로세스의 커널 스페이스 CPU 사용률
```

**jdk.ExecutionSample** — CPU 프로파일링 샘플이다. JFR이 지정된 간격(기본 10~20ms)으로 실행 중인 스레드의 스택 트레이스를 기록한다. 스택 최상단 프레임의 메서드(`className#methodName`)를 키로 카운트를 누적한다.

```java
RecordedStackTrace stack = event.getStackTrace();
RecordedMethod method = stack.getFrames().getFirst().getMethod();
String key = method.getType().getName() + "#" + method.getName();
executionSamples.merge(key, 1, Integer::sum);
```

이 카운트 맵이 Hot Methods 분석의 원천.

#### GcHandler

`jdk.GarbageCollection`과 `jdk.GCHeapSummary` 두 이벤트를 조합해 GC 이벤트 하나에 힙 전후 크기를 함께 기록한다.

```plain
jdk.GCHeapSummary (when="Before GC") → gcId별 heapBefore 임시 저장
jdk.GCHeapSummary (when="After GC")  → heapBefore + heapAfter 쌍으로 heapAfterMap에 저장
jdk.GarbageCollection                → duration, cause, name + heapAfterMap 조회 → RawGcEvent 생성
```

`gcId` 필드가 세 이벤트를 연결하는 키다. GCHeapSummary가 GarbageCollection보다 먼저 도착하므로 중간 저장소(`heapBefore`, `heapAfterMap`)로 이벤트를 조합한다.

```plain
RawGcEvent
  ├── startEpochMs    GC 시작 시각
  ├── pauseMs         Stop-The-World 시간 (GarbageCollection.duration)
  ├── cause           GC 발생 원인 (예: "G1 Evacuation Pause")
  ├── name            GC 이름 (예: "G1New")
  ├── heapBeforeBytes GC 직전 힙 사용량
  └── heapAfterBytes  GC 직후 힙 사용량
```

#### MemoryHandler

`jdk.GCHeapSummary`로 힙 사용량 타임라인을 구성하고, `jdk.ObjectAllocationInNewTLAB` / `jdk.ObjectAllocationOutsideTLAB`으로 클래스별 할당량을 누적한다.

할당 이벤트에서 클래스 이름은 `event.getClass("objectClass").getName()`으로 읽는다. `getValue()`가 아닌 타입 지정 accessor를 써야 `RecordedClass` 타입을 올바르게 받을 수 있다.

```plain
jdk.ObjectAllocationInNewTLAB
  └── objectClass (RecordedClass)  할당된 객체의 클래스
  └── tlabSize    (long)           TLAB 크기 (bytes)

jdk.ObjectAllocationOutsideTLAB
  └── objectClass (RecordedClass)
  └── allocationSize (long)
```

#### ThreadHandler

`jdk.JavaMonitorEnter`로 모니터 락 경합 이벤트를 수집한다. 이벤트 자체의 `duration`이 락 대기 시간이다. `monitorClass`는 `event.getClass()`, `eventThread`는 `event.getThread()`로 각각 타입 지정 접근한다.

`jdk.JavaThreadStatistics`는 JFR이 주기적으로 기록하는 스레드 수 통계로, `activeCount` 필드를 읽어 시계열 데이터로 저장한다.

---

## 2단계 — Analyzer

각 Analyzer는 핸들러가 수집한 raw 데이터를 받아 두 가지 작업을 수행한다.

1. **buildSummary()** — 통계 집계 (평균, 최대, 상위 N개 등)
2. **analyze()** — 임계값 기반 이상 탐지 → `List<Finding>` 반환

### Finding 구조

```java
record Finding(
    Severity severity,    // CRITICAL / WARNING / INFO
    String category,      // "CPU" / "GC" / "Memory" / "Thread"
    String title,
    String description,
    String recommendation
) {}
```

### CpuAnalyzer 임계값

| 조건 | 심각도 |
|------|--------|
| maxUser > 80% AND avgUser > 80% | CRITICAL |
| maxUser > 80% AND avgUser ≤ 80% | WARNING |
| 상위 1위 메서드 점유율 > 20% | WARNING |

Hot Methods는 `executionSamples` 맵을 카운트 내림차순 정렬 후 상위 10개를 뽑는다. 각 메서드의 점유율은 `(해당 메서드 샘플 수 / 전체 샘플 수) × 100`으로 계산한다.

### GcAnalyzer 임계값

| 조건 | 심각도 |
|------|--------|
| maxPause ≥ 500ms | CRITICAL |
| maxPause ≥ 200ms | WARNING |
| totalSTW / recordingDuration > 5% | WARNING |

STW 비율은 녹화 전체 시간 대비 GC로 소비된 시간의 비중이다. 5%를 넘으면 애플리케이션이 실질적으로 95% 미만의 시간만 실제 작업에 쓰고 있다는 의미다.

### MemoryAnalyzer 임계값

| 조건 | 심각도 |
|------|--------|
| maxHeap / committedHeap > 85% | WARNING |
| 최다 할당 클래스 총량 > 100MB | INFO |

Top Allocators는 클래스별 누적 할당량을 `Map<String, Long>`으로 집계한 뒤 내림차순 상위 10개를 추출한다.

```java
Map<String, Long> byClass = new HashMap<>();
for (var s : allocSamples) {
    byClass.merge(s.className(), s.bytes(), Long::sum);
}
```

### ThreadAnalyzer 임계값

| 조건 | 심각도 |
|------|--------|
| totalContentionMs > 5,000ms | CRITICAL |
| totalContentionMs > 1,000ms | WARNING |
| 100ms 이상 대기 이벤트 존재 시 최장 항목 | INFO |

Top Contentions는 100ms 이상 대기한 이벤트만 필터링해 대기 시간 내림차순 상위 10개를 반환한다.

---

## 3단계 — TimelineBuilder

각 핸들러의 raw 샘플을 1초 단위 `TimeBucket`으로 집계한다. 차트의 x축 데이터로 사용된다.

### 버킷 인덱스 계산

```java
private static int idx(Instant t, Instant start, int max) {
    long s = ChronoUnit.SECONDS.between(start, t);
    return (int) Math.max(0, Math.min(s, max - 1));
}
```

시작 시각 기준으로 몇 초 경과했는지를 인덱스로 변환한다. 최대 버킷 수는 3,600개(1시간)로 제한한다.

### 집계 방식

| 데이터 | 집계 방식 |
|--------|-----------|
| CPU user/system | 같은 버킷 내 샘플 평균 |
| 힙 사용량 | 같은 버킷 내 샘플 평균 |
| GC 횟수 | 버킷 내 발생 횟수 합산 |
| GC pause | 버킷 내 pause 합산 (ms) |
| 스레드 수 | 같은 버킷 내 샘플 평균 |
| Lock contention | 버킷 내 발생 횟수 합산 |

---

## 4단계 — HtmlRenderer

```java
String template = loadTemplate();          // /templates/report.html 로드
String json     = mapper.writeValueAsString(result);  // AnalysisResult → JSON
String html     = template.replace("/*__HOTPATH_DATA__*/", json);
Files.writeString(outputPath, html, StandardCharsets.UTF_8);
```

`AnalysisResult` 전체를 Jackson으로 JSON 직렬화해 HTML 템플릿의 플레이스홀더에 치환한다. `JavaTimeModule`을 등록하고 `WRITE_DATES_AS_TIMESTAMPS`를 비활성화해 `Instant`가 ISO-8601 문자열로 직렬화된다.

### 템플릿 구조

```html
<script>
const DATA = /*__HOTPATH_DATA__*/;  ← JSON 삽입 지점
</script>

<!-- 이후 렌더링 스크립트 -->
<script>
(function () {
    // DATA를 읽어 Plotly.js로 차트 그리기
    Plotly.newPlot('chart-cpu-load', [...]);
    Plotly.newPlot('chart-gc-timeline', [...]);
    ...
})();
</script>
```

Java가 JSON을 주입하는 부분은 한 줄이다. 나머지 HTML/CSS/JS는 전부 정적이다. 이 방식 덕분에 렌더링 로직을 Java에서 관리할 필요가 없고, 차트 UI를 수정할 때 Java 코드를 건드리지 않아도 된다.

---

## 모듈 구조

```plain
hotpath/
├── hotpath-core/
│   └── src/main/java/org/yyubin/hotpath/
│       ├── model/
│       │   ├── AnalysisResult.java   전체 결과 집합 (렌더러에 전달)
│       │   ├── TimeBucket.java       1초 단위 집계 슬롯
│       │   ├── CpuSummary.java       CPU 통계 + Hot Methods
│       │   ├── GcSummary.java        GC 통계 + 이벤트 목록
│       │   ├── MemorySummary.java    힙 통계 + Top Allocators
│       │   ├── ThreadSummary.java    스레드 통계 + Lock Contention
│       │   ├── RecordingMeta.java    JVM 정보, 녹화 시간
│       │   └── Finding.java          이상 탐지 결과
│       ├── reader/
│       │   ├── JfrReader.java        파일 읽기 + 라우터 조립
│       │   ├── EventRouter.java      타입명 → 핸들러 목록 디스패치
│       │   ├── ReadResult.java       핸들러 묶음 전달 객체
│       │   ├── TimelineBuilder.java  raw 샘플 → TimeBucket 집계
│       │   └── handler/
│       │       ├── EventHandler.java (interface)
│       │       ├── MetaHandler.java
│       │       ├── CpuHandler.java
│       │       ├── GcHandler.java
│       │       ├── MemoryHandler.java
│       │       └── ThreadHandler.java
│       ├── analyzer/
│       │   ├── CpuAnalyzer.java
│       │   ├── GcAnalyzer.java
│       │   ├── MemoryAnalyzer.java
│       │   └── ThreadAnalyzer.java
│       └── renderer/
│           └── HtmlRenderer.java
│
├── hotpath-cli/
│   └── src/main/java/org/yyubin/hotpath/
│       ├── HotpathCommand.java   파이프라인 조립 및 실행
│       └── Main.java             Picocli 진입점
│
└── hotpath-core/src/main/resources/
    └── templates/report.html     정적 HTML 템플릿 + Plotly.js
```

---

## 데이터 흐름 요약

```plain
JFR 이벤트                    핸들러 상태               Analyzer 출력
─────────────────────────────────────────────────────────────────────
jdk.CPULoad          ──►  List<CpuSample>      ──►  CpuSummary
jdk.ExecutionSample  ──►  Map<method, count>   ──►  Hot Methods

jdk.GCHeapSummary    ──►  Map<gcId, heap[]>    ─┐
jdk.GarbageCollection──►  List<RawGcEvent>     ─┴►  GcSummary

jdk.GCHeapSummary    ──►  List<HeapSample>     ──►  MemorySummary
jdk.ObjectAlloc*     ──►  List<AllocSample>    ──►  Top Allocators

jdk.JavaMonitorEnter ──►  List<ContentionEvent>──►  ThreadSummary
jdk.JavaThreadStats  ──►  List<ThreadCountSample>

모든 핸들러 상태     ──►  TimelineBuilder      ──►  List<TimeBucket>

CpuSummary + GcSummary + MemorySummary + ThreadSummary + TimeBucket
                                         ──►  AnalysisResult
                                         ──►  JSON
                                         ──►  report.html
```

---

## 수집 조건 — JFR 설정에 따른 가용성

Hotpath가 읽는 이벤트 중 일부는 JFR 설정에 따라 기록되지 않을 수 있다. 이벤트가 없으면 해당 항목은 빈 상태(0, 빈 목록)로 처리되며 리포트에 "데이터 없음"으로 표시된다.

| 이벤트 | default.jfc | profile.jfc |
|--------|:-----------:|:-----------:|
| `jdk.CPULoad` | ✅ | ✅ |
| `jdk.ExecutionSample` | ✅ | ✅ |
| `jdk.GarbageCollection` | ✅ | ✅ |
| `jdk.GCHeapSummary` | ✅ | ✅ |
| `jdk.ObjectAllocation*` | ❌ | ✅ |
| `jdk.JavaMonitorEnter` | ❌ | 부분 |
| `jdk.JavaThreadStatistics` | ✅ | ✅ |

전체 측정치를 수집하려면 `settings=profile` 또는 커스텀 `hotpath.jfc`로 녹화해야 한다.

---

## UI

![](https://velog.velcdn.com/images/cassidy/post/339a9048-cb6c-406c-99e3-6797b2310b3d/image.png)
![](https://velog.velcdn.com/images/cassidy/post/f085e6aa-bc1a-4023-bbcf-36f968b9e09d/image.png)
![](https://velog.velcdn.com/images/cassidy/post/0c4dcdbe-b031-4bb7-9199-6762bfd916cb/image.png)
![](https://velog.velcdn.com/images/cassidy/post/f43520ee-3cac-48a3-b6e7-4ad6e7725a39/image.png)

---

## 관련 링크

- [깃허브 바로가기](https://github.com/yyubin/hotpath) 
- [예시 리포트 바로가기](https://yyubin.github.io/hotpath/sample-report.html)

---

기여, 이슈, 제안 및 제언 언제나 환영🤗