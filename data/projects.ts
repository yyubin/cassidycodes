import { Project } from "@/types";

export const projects: Project[] = [
  {
    id: "1",
    title: "Sprout",
    slug: "sprout",
    tldr: "Spring Boot의 핵심 기능(IoC/DI, AOP, MVC)을 직접 구현한 경량 웹 프레임워크. 비동기 논블로킹 NIO 서버와 WebSocket을 직접 구현하고, JIT 컴파일러 최적화를 통해 응답 안정성을 29% 향상시켰습니다.",
    overview:
      "Spring Boot의 핵심 기능을 직접 구현하여 프레임워크 내부 동작 원리를 깊이 이해하고자 시작한 프로젝트입니다. IoC/DI 컨테이너, AOP 프록시, MVC 패턴을 밑바닥부터 구현하며 Spring의 설계 철학을 체득했습니다. 또한 비동기 논블로킹 서버 아키텍처를 설계하고 WebSocket 실시간 통신 프로토콜을 직접 구현했습니다.",
    heroStats: [
      { label: "성능 향상", value: "29%" },
      { label: "테스트 커버리지", value: "85%+" },
      { label: "단위 테스트", value: "687개" },
      { label: "기술 블로그 글", value: "14편" },
    ],
    achievements: [
      "Java Reflection과 CGLIB를 활용한 커스텀 IoC/DI 컨테이너 구현",
      "프록시 패턴 기반의 AOP(관점 지향 프로그래밍) 구현",
      "Annotation 기반 MVC 프레임워크 및 DispatcherServlet 구현",
      "NIO Selector와 이벤트 루프 기반의 비동기 논블로킹 HTTP 서버 구현",
      "WebSocket 프로토콜 직접 구현으로 실시간 양방향 통신 지원",
      "async-profiler, JMC, JITWatch를 활용한 성능 분석 및 최적화",
      "JIT 컴파일러 친화적 코드 리팩토링으로 응답 안정성 29% 향상",
      "687개 단위 테스트 작성 (라인 커버리지 85%+, 분기 커버리지 75%+)",
    ],
    techStack: [
      "Java 21",
      "Reflection API",
      "CGLIB",
      "NIO (Non-blocking I/O)",
      "WebSocket",
      "JUnit 5",
      "async-profiler",
      "JMC (Java Mission Control)",
      "JITWatch",
    ],
    relatedArticles: [
      {
        title: "Annotation과 Reflection, 메타 프로그래밍 시작기",
        section: "articles",
        slug: "sprout1",
      },
      { title: "DI/IoC 컨테이너의 태동", section: "articles", slug: "sprout2" },
      {
        title: "DispatcherServlet의 본질",
        section: "articles",
        slug: "sprout3",
      },
      {
        title: "ArgumentResolver를 직접 구현하며 배운 것들",
        section: "articles",
        slug: "sprout4",
      },
      {
        title: "AOP 만들기 (1) — 프록시와 인터셉션",
        section: "articles",
        slug: "sprout5",
      },
      {
        title: "AOP 만들기 (2) — 어드바이스/포인트컷을 구현하며",
        section: "articles",
        slug: "sprout6",
      },
      {
        title: "커스텀 서버의 첫 성능 실험",
        section: "articles",
        slug: "sprout7",
      },
      {
        title: "DI/IoC 컨테이너 아키텍처 재설계 (1)",
        section: "articles",
        slug: "sprout8",
      },
      {
        title: "DI/IoC 컨테이너 아키텍처 재설계 (2)",
        section: "articles",
        slug: "sprout9",
      },
      {
        title: "커스텀 Non-Blocking I/O 서버 아키텍처 전체 해부",
        section: "articles",
        slug: "sprout10",
      },
      {
        title: "async-profiler로 서버의 병목을 추적하다",
        section: "articles",
        slug: "sprout11",
      },
      {
        title: "JMC + JITWatch로 본 JIT 컴파일의 세계",
        section: "articles",
        slug: "sprout12",
      },
      {
        title: "성능 개선 리팩토링 — JIT 친화적 서버로 만들기",
        section: "articles",
        slug: "sprout13",
      },
      {
        title: "WebSocket을 직접 구현하면서 배운 것들: NIO부터 프레임 파싱까지",
        section: "articles",
        slug: "sprout-websocket",
      },
    ],
    diagrams: [
      {
        title: "컨테이너 초기화 & 빈 생명주기",
        description:
          "SproutApplicationContext가 초기화되면서 Phase 별로 빈을 생성하는 전체 과정",
        mermaidFile: "sprout/container-lifecycle",
      },
      {
        title: "빈 생성 전략 패턴 (Strategy Pattern)",
        description:
          "BeanDefinition의 생성 방식에 따라 적절한 전략을 선택하여 빈을 인스턴스화하는 과정",
        mermaidFile: "sprout/bean-strategy",
      },
      {
        title: "위상 정렬 & 순환 의존성 감지 (Kahn's Algorithm)",
        description:
          "BFS 기반 위상 정렬로 빈 생성 순서를 결정하고 순환 의존성을 사전 감지",
        mermaidFile: "sprout/topological-sort",
      },
      {
        title: "AOP 초기화 & Advisor 생성",
        description:
          "@Aspect 클래스를 스캔하여 Advisor를 생성하고 AdvisorRegistry에 등록하는 과정",
        mermaidFile: "sprout/aop-init",
      },
      {
        title: "AOP 프록시 생성 & 적용",
        description:
          "BeanPostProcessor가 빈 생성 시점에 Pointcut 매칭을 확인하고 프록시를 생성하는 과정",
        mermaidFile: "sprout/aop-proxy",
      },
      {
        title: "AOP 런타임: Advice 체인 실행",
        description:
          "프록시 메서드 호출 시 BeanMethodInterceptor가 Advice 체인을 순차적으로 실행하는 과정",
        mermaidFile: "sprout/aop-runtime",
      },
      {
        title: "HTTP 요청 처리 플로우 (Pure NIO)",
        description:
          "Selector 기반 이벤트 루프에서 HTTP 요청을 받아 처리하고 응답하는 전체 과정",
        mermaidFile: "sprout/http-nio-flow",
      },
      {
        title: "I/O Thread vs Worker Thread 구조",
        description:
          "이벤트 루프(I/O Thread)와 비즈니스 로직 처리(Worker Thread)의 역할 분리",
        mermaidFile: "sprout/io-thread-structure",
      },
      {
        title: "프로토콜 라우팅 (WebSocket vs HTTP)",
        description:
          "WebSocket은 항상 NIO로, HTTP는 서버 모드에 따라 NIO 또는 BIO로 처리",
        mermaidFile: "sprout/protocol-routing",
      },
      {
        title: "WebSocket RFC 6455 핸드셰이크",
        description:
          "HTTP Upgrade 요청부터 101 Switching Protocols 응답까지, Sec-WebSocket-Accept 계산을 포함한 핸드셰이크 전체 흐름",
        mermaidFile: "sprout/ws-handshake",
      },
      {
        title: "WebSocket 프레임 파싱 (비트 레벨)",
        description:
          "수신된 바이트 스트림에서 FIN/Opcode/MASK/PayloadLen을 파싱하고, 확장 길이 및 XOR 마스킹을 처리하는 과정",
        mermaidFile: "sprout/ws-frame-parsing",
      },
      {
        title: "WebSocket 메시지 디스패처 체인",
        description:
          "수신된 WebSocketFrame이 Chain of Responsibility 구조를 통해 적절한 디스패처를 선택하고 @MessageMapping 핸들러를 실행하는 과정",
        mermaidFile: "sprout/ws-dispatcher-chain",
      },
      {
        title: "논블로킹 쓰기 & 백프레셔 처리",
        description:
          "sendText() 호출이 즉시 반환되고, pendingWrites 큐와 OP_WRITE 이벤트를 통해 실제 전송이 비동기로 이루어지는 메커니즘",
        mermaidFile: "sprout/ws-nonblocking-write",
      },
    ],
    githubUrl: "https://github.com/yyubin/sprout",
    retrospective: {
      summary:
        "Spring을 매일 쓰면서도 내부가 어떻게 돌아가는지 모른다는 불안감이 컸는데, 직접 구현하면서 그 불안이 사라졌다. 프레임워크는 마법이 아니라 잘 설계된 패턴의 집합이라는 걸 몸으로 이해했다.",
      learnings: [
        "NIO Selector 기반 이벤트 루프를 구현하면서 블로킹과 논블로킹의 차이가 코드 레벨에서 어떻게 표현되는지 직접 경험했다. Spring이 왜 그런 설계를 선택했는지 자연스럽게 납득됐다.",
        "RFC 6455를 읽고 WebSocket을 구현하면서, 명세서가 단순히 '이렇게 해라'가 아니라 '왜 이렇게 설계했는가'까지 담고 있다는 것을 알았다. 마스킹, Sec-WebSocket-Accept, close 핸드셰이크 모두 납득할 이유가 있었다.",
        "JIT 최적화 분석을 통해 '빠른 코드'가 단순히 알고리즘 최적화가 아니라 JVM이 최적화하기 좋은 코드를 작성하는 것임을 배웠다. async-profiler와 JITWatch를 쓰기 전까지는 막연했던 개념이었다.",
        "바퀴를 다시 만드는 것이 낭비처럼 보이지만, 그 과정에서 얻는 이해의 깊이는 다른 방법으로 대체하기 어렵다. 687개의 테스트를 작성하면서 설계의 결함을 스스로 발견하고 고치는 경험이 특히 좋았다.",
      ],
    },
  },
  {
    id: "2",
    title: "Jinx",
    slug: "jinx",
    tldr: "JPA Entity 변경을 컴파일 타임에 감지하여 MySQL DDL SQL을 자동 생성하는 오픈소스 라이브러리. APT의 처리 순서 비보장·증분 컴파일 문제를 지연 처리 큐와 JSON 스냅샷으로 해결하고, rename 휴리스틱의 위험성을 인식하여 완전한 Deterministic Diff로 전환했습니다.",
    overview:
      "JPA를 사용하는 프로젝트에서 Entity 변경 시 수동으로 마이그레이션 파일을 작성하는 번거로움을 해결하기 위해 개발한 도구입니다. Java Annotation Processor를 활용하여 컴파일 타임에 Entity를 분석하고, 스키마 변경사항을 자동으로 감지하여 MySQL DDL과 롤백 SQL을 생성합니다. 현재 MySQL을 대응하고 있습니다.\n\n개발 과정에서 APT의 처리 순서 비보장 문제는 지연 처리 큐(deferredEntities)와 동적 재시도 횟수로, 증분 컴파일 환경에서의 불완전한 Entity 노출 문제는 JSON 스냅샷 비교 방식으로 해결했습니다. 또한 rename 탐지 휴리스틱이 데이터베이스 연구 분야에서 20년 이상 다뤄진 '스키마 매칭' 난제임을 파악하고, 운영 DB 안전성을 최우선으로 삼아 과감히 제거하여 완전한 Deterministic Diff로 전환했습니다.",
    heroStats: [
      { label: "Maven Central", value: "v0.1.2" },
      { label: "Diff 방식", value: "Deterministic" },
      { label: "증분 컴파일 대응", value: "JSON 스냅샷" },
      { label: "순환 의존성 감지", value: "지연 처리 큐" },
    ],
    reflectionArticle: {
      title: "Jinx 개발 회고",
      slug: "jinx",
      description:
        "JPA 애노테이션으로 DB 마이그레이션을 자동화하는 과정에서 겪은 문제와 해결 과정",
    },
    achievements: [
      "Java Annotation Processor를 활용한 컴파일 타임 Entity 분석",
      "APT 처리 순서 비보장 문제를 지연 처리 큐(deferredEntities)와 동적 재시도 횟수(max(20, entityCount×2))로 해결",
      "증분 컴파일 환경에서 불완전한 Entity 노출 문제를 JSON 스냅샷 기반 비교 전략으로 극복",
      "rename 탐지 휴리스틱이 '스키마 매칭' 연구 난제임을 인식, 운영 안전성을 위해 Deterministic Diff로 전환",
      "테이블, 컬럼, FK, 인덱스 등 모든 스키마 변경사항 자동 감지 및 MySQL DDL·롤백 SQL 생성",
      "멀티 모듈 구조로 설계하여 Maven Central에 정식 배포 (v0.0.13)",
    ],
    techStack: [
      "Java",
      "Annotation Processor (APT)",
      "JPA / Jakarta Persistence",
      "MySQL",
      "Maven",
      "Schema Diff Algorithm",
      "JSON Snapshot",
    ],
    relatedArticles: [
      {
        title: "Java APT 활용 시 유의사항 — 컴파일 타임 라이브러리 개발기",
        section: "articles",
        slug: "precautions-for-handling-java-apt",
      },
      {
        title: "Jinx - ColumnDiffer 리팩토링 회고: rename 탐지를 제거한 이유",
        section: "reflections",
        slug: "jinx-dispose-rename",
      },
      {
        title: "사이드 프로젝트에 Jinx 적용 후기",
        section: "til",
        slug: "jinx-user-review",
      },
    ],
    diagrams: [
      {
        title: "APT 컴파일 파이프라인",
        description:
          "Java 컴파일러 안에서 Jinx Processor가 동작하는 전체 흐름 — Entity 스캔부터 MySQL DDL SQL 출력까지",
        mermaidFile: "jinx/compilation-pipeline",
      },
      {
        title: "스키마 Diff 플로우",
        description:
          "이전 스냅샷 JSON과 현재 SchemaModel을 비교하여 MySQL DDL과 롤백 SQL을 생성하는 Deterministic Diff 엔진",
        mermaidFile: "jinx/schema-diff-flow",
      },
      {
        title: "지연 처리 큐 & 순환 의존성 감지",
        description:
          "APT 처리 순서 비보장 문제를 deferredEntities 큐와 동적 재시도로 해결하고, 3회 연속 진전 없음 시 순환 의존성으로 판단하는 메커니즘",
        mermaidFile: "jinx/deferred-processing",
      },
      {
        title: "ProcessingContext 캐싱 구조",
        description:
          "라운드마다 초기화되는 캐시 레이어와 양방향 관계 순환 감지 셋 — APT 환경에서의 안전한 상태 관리 전략",
        mermaidFile: "jinx/processing-context",
      },
    ],
    githubUrl: "https://github.com/yyubin/jinx",
    retrospective: {
      summary:
        "처음엔 간단해 보였는데, 갈수록 APT라는 환경의 특수성과 DB 마이그레이션이라는 분야의 복잡성이 드러났다. rename 탐지를 제거하기로 한 결정이 기술적으로 가장 어려웠지만, 가장 올바른 선택이었다고 생각한다.",
      learnings: [
        "APT는 런타임과 완전히 다른 환경이다. Class.forName()이 안 되고, TypeElement의 라운드 유효성을 관리해야 하는 등 처음엔 당황스러운 제약이 많았다. 하지만 그 제약들이 생긴 이유를 이해하면서 컴파일러 동작 방식을 더 깊이 배웠다.",
        "rename 탐지가 '스키마 매칭'이라는 20년 된 연구 분야의 문제임을 뒤늦게 알았다. 코딩을 시작하기 전에 해당 도메인 공부가 먼저였어야 했다. 기술보다 도메인 이해가 먼저라는 교훈을 얻었다.",
        "'똑똑한 자동화'가 DB처럼 중요한 시스템에서는 오히려 위험할 수 있다. Deterministic한 결과를 내는 단순한 도구가 더 신뢰할 수 있다는 걸 배웠고, 이를 실제 결정에 반영했다.",
        "Maven Central 배포는 생각보다 진입장벽이 높았다. 멀티 모듈 구조 설계와 배포 파이프라인 구성이 기능 구현만큼이나 중요한 작업이었고, 라이브러리를 만드는 것과 배포 가능한 라이브러리를 만드는 것은 다르다는 걸 체감했다.",
      ],
    },
    externalLinks: [
      {
        label: "Maven Central",
        url: "https://central.sonatype.com/artifact/io.github.yyubin/jinx-core",
      },
      {
        label: "Gradle Plugin Portal",
        url: "https://plugins.gradle.org/plugin/io.github.yyubin.jinx",
      },
    ],
  },
  {
    id: "3",
    title: "BookVoyage",
    slug: "bookvoyage",
    tldr: "도서 소셜 플랫폼. Neo4j 그래프 CF + Elasticsearch CB 하이브리드 추천 시스템, Kafka + Redis ZSET 실시간 이벤트 반영. Gatling 부하 테스트로 커넥션 풀 고갈 문제를 발견하고 개선하여 p99 60,002ms → 106ms, 실패율 4.5% → 0% 달성.",
    overview:
      "도서 기록과 리뷰를 공유하는 소셜 플랫폼입니다. Neo4j 그래프 기반 협업 필터링(CF)과 Elasticsearch 콘텐츠 기반 필터링(CB)을 결합한 하이브리드 추천 파이프라인을 직접 설계했습니다. Kafka로 수집한 사용자 행동 이벤트를 Redis ZSET에 즉시 반영하여 다음 추천 요청부터 실시간으로 정렬에 영향을 주는 구조를 구현했습니다.\n\nGatling으로 4단계 부하 시뮬레이션(Baseline → Batch ON → Spike → Cooldown)을 진행했고, HikariCP 단일 커넥션 풀 고갈(waiting 131개)이 근본 원인임을 확인했습니다. Primary 풀(30)과 Outbox 배치 전용 풀(5)로 분리하고 외부 API 타임아웃과 Redis 캐싱을 추가하여 p99를 60,002ms에서 106ms로 개선하고 실패를 완전히 제거했습니다.",
    heroStats: [
      { label: "p99 응답 개선", value: "99.8%" },
      { label: "실패율", value: "0%" },
      { label: "처리량 향상", value: "+33%" },
      { label: "배포 환경", value: "AWS" },
    ],
    achievements: [
      "Neo4j 그래프 CF + Elasticsearch CB 하이브리드 추천 파이프라인 설계 (Graph×0.4 + Semantic×0.3 + Popularity×0.1 + Freshness×0.05)",
      "Kafka + Redis ZSET(ZINCRBY) 기반 사용자 행동 실시간 반영 구조 구현",
      "윈도우 샘플링으로 추천 상위 품질 유지하면서 다양성 확보",
      "OpenAI 기반 사용자 독서 페르소나 자동 생성 및 추천 설명 생성",
      "HikariCP 단일 풀 고갈(10개) 원인 분석, Primary(30) / Outbox(5) 이중 풀 분리로 API-배치 커넥션 경합 제거",
      "Kakao → Google Books 폴백 + Redis 캐싱(TTL 1시간) + 타임아웃(Connect 3s + Read 5s)으로 외부 API 장애 전파 차단",
      "Gatling 4단계 시뮬레이션: p99 60,002ms → 106ms, 실패율 4.5% → 0%, 처리량 16.26 → 21.59 RPS",
      "AWS EC2 + RDS + S3 + CloudFront + Route53 + Docker 기반 배포",
    ],
    techStack: [
      "Java",
      "Spring Boot",
      "MySQL",
      "Neo4j",
      "Elasticsearch",
      "Redis",
      "Kafka",
      "OpenAI",
      "Gatling",
      "AWS (EC2 / RDS / S3 / CloudFront / Route53)",
      "Docker",
    ],
    relatedArticles: [
      {
        title: "p99 60초에서 106ms로 — BookVoyage 성능 개선 보고서",
        section: "articles",
        slug: "bookvoyage-performance-improvement-report",
      },
      {
        title: "BookVoyage 추천 시스템 v1 설계와 한계",
        section: "til",
        slug: "bookvoyage-recommendation-system-v1",
      },
    ],
    diagrams: [
      {
        title: "전체 시스템 아키텍처",
        description:
          "AWS 인프라(EC2 / RDS / S3 / CloudFront / Route53)와 데이터 레이어(Neo4j / Elasticsearch / Redis / Kafka), 외부 연동(OpenAI / Kakao Books) 전체 구성",
        mermaidFile: "bookvoyage/system-architecture",
      },
      {
        title: "하이브리드 추천 파이프라인",
        description:
          "Redis ZSET 캐시 히트/미스에 따라 Neo4j CF + Elasticsearch CB 후보 생성 → 하이브리드 스코어링 → 윈도우 샘플링까지의 전체 추천 흐름",
        mermaidFile: "bookvoyage/recommendation-pipeline",
      },
      {
        title: "Kafka → Redis ZSET 실시간 이벤트 반영",
        description:
          "사용자 행동 이벤트가 Kafka를 통해 Redis ZSET에 ZINCRBY되어 다음 추천 요청부터 정렬에 즉시 반영되는 비동기 구조",
        mermaidFile: "bookvoyage/realtime-event-flow",
      },
      {
        title: "HikariCP 커넥션 풀 분리 & 외부 API 방어",
        description:
          "단일 풀 고갈(KO 2,009건) 원인 분석 및 Primary/Outbox 이중 풀 분리, 외부 API 타임아웃 + 폴백 + Redis 캐싱 개선 구조",
        mermaidFile: "bookvoyage/connection-pool-separation",
      },
    ],
    githubUrl: "https://github.com/yyubin/bookvoyage",
    retrospective: {
      summary:
        "추천 시스템은 논문이나 블로그에서 보면 명확해 보이지만, 실제로 만들어보면 데이터가 없고 평가 기준도 불분명하다. 오히려 Gatling 부하 테스트에서 발견한 커넥션 풀 고갈 문제가 더 실질적이고 깊은 배움이었다.",
      learnings: [
        "Gatling 테스트 전에는 커넥션 풀 설정이 그냥 숫자 하나라고 생각했다. 테스트 결과를 보고 나서야 커넥션 풀이 동시성 제어 장치이며, 풀 크기는 트래픽 패턴과 배치 작업을 함께 고려해서 설계해야 한다는 걸 이해했다.",
        "외부 API(Kakao Books)가 느려지면 내 서버의 DB 커넥션도 같이 고갈된다는 연쇄 장애 패턴을 직접 경험했다. 시스템 경계에서는 항상 타임아웃과 폴백을 설정해야 한다는 것을 깨달았다.",
        "Neo4j + Elasticsearch + Redis를 조합한 추천 파이프라인은 원하는 방향으로 만들었지만, 추천 품질을 객관적으로 측정하는 체계를 갖추지 못했다. 시스템을 만들면서 동시에 평가 지표도 설계했어야 했다는 아쉬움이 남는다.",
        "추천 시스템을 스스로 평가하면서 내가 구현한 것과 구현하지 않은 것을 명확히 정리할 수 있었다. 내 주분야가 아닌 영역에서 적절한 선을 그을 수 있는 것도 중요한 판단이라는 걸 배웠다.",
      ],
    },
  },
];
