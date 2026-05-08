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
      { label: "Diff 방식", value: "결정적" },
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
      "멀티 모듈 구조로 설계하여 Maven Central에 정식 배포 (v0.1.2)",
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
  {
    id: "4",
    title: "Hotpath",
    slug: "hotpath",
    tldr: "JVM .jfr 파일을 단일 패스로 파싱해 CPU·GC·메모리·스레드 경합을 분석하고, Plotly.js 인터랙티브 차트가 내장된 단일 HTML 리포트로 출력하는 CLI 도구. JMC 없이 브라우저에서 바로 열어볼 수 있어 성능 분석 결과를 빠르게 공유할 수 있습니다.",
    overview:
      "JMC는 훌륭한 도구지만 리포트 형태로 공유하기 어렵고, 벤치마크 도구 리포트는 방대해서 한눈에 보기 어렵다는 문제에서 출발했습니다. Hotpath는 .jfr 파일을 처음부터 끝까지 한 번만 읽는 단일 패스 구조로, 이벤트를 전부 메모리에 올리지 않고 각 핸들러가 집계 상태만 유지합니다. EventRouter가 이벤트 타입 이름을 키로 핸들러를 분기하고, 4개의 Analyzer가 임계값 기반 이상 탐지를 수행합니다.\n\nJava 코드는 JSON 직렬화까지만 담당하고 차트 렌더링은 Plotly.js가 처리하는 데이터·뷰 분리 원칙으로 설계되어, HTML 템플릿 수정 시 Java 코드를 건드릴 필요가 없습니다. JDK 내장 jdk.jfr.consumer API만 사용하므로 별도 파서 라이브러리 없이 동작합니다.",
    heroStats: [
      { label: "설계", value: "단일 패스" },
      { label: "외부 파서 의존성", value: "없음" },
      { label: "분석 항목", value: "4가지" },
      { label: "출력", value: "단일 HTML" },
    ],
    achievements: [
      "JDK 내장 jdk.jfr.consumer API 활용으로 외부 파서 라이브러리 없는 JFR 파싱",
      "단일 패스 스트리밍으로 수백 MB JFR 파일도 메모리 고갈 없이 처리",
      "EventRouter + 핸들러 패턴으로 이벤트 타입별 분기 처리 (멀티 구독 지원)",
      "gcId를 키로 GCHeapSummary + GarbageCollection 이벤트를 조합해 GC 전후 힙 크기 추적",
      "CPU·GC·메모리·스레드 4개 Analyzer의 임계값 기반 이상 탐지 및 Finding(CRITICAL / WARNING / INFO) 생성",
      "raw 샘플을 1초 단위 TimeBucket으로 집계하여 Plotly.js 차트 x축 데이터 구성",
      "AnalysisResult → Jackson JSON 직렬화 후 HTML 템플릿 플레이스홀더 치환으로 단일 HTML 리포트 생성",
      "데이터·뷰 분리 원칙 — 렌더링 로직을 Java에서 완전히 제거하여 차트 UI 수정 시 Java 코드 변경 불필요",
    ],
    techStack: [
      "Java 21",
      "JDK JFR API (jdk.jfr.consumer)",
      "Picocli",
      "Jackson",
      "Plotly.js",
    ],
    relatedArticles: [
      {
        title: "Hotpath 내부 구조 — 단일 패스 JFR 분석기 설계",
        section: "articles",
        slug: "hotpath-internals",
      },
    ],
    diagrams: [
      {
        title: "전체 파이프라인 (4단계)",
        description:
          ".jfr 파일이 JfrReader → EventRouter → 핸들러 → Analyzer → TimelineBuilder → HtmlRenderer를 거쳐 report.html로 출력되는 전체 흐름",
        mermaidFile: "hotpath/pipeline-overview",
      },
      {
        title: "이벤트 라우팅 구조",
        description:
          "EventRouter가 JFR 이벤트 타입명을 키로 핸들러를 분기하는 구조. jdk.GCHeapSummary가 GcHandler와 MemoryHandler 두 곳에 동시 구독되는 멀티 구독 패턴을 포함",
        mermaidFile: "hotpath/event-routing",
      },
      {
        title: "Analyzer 임계값 & Finding 생성",
        description:
          "CpuAnalyzer·GcAnalyzer·MemoryAnalyzer·ThreadAnalyzer 각각의 임계값 조건과 CRITICAL / WARNING / INFO 심각도 분류 체계",
        mermaidFile: "hotpath/analyzer-findings",
      },
    ],
    githubUrl: "https://github.com/yyubin/hotpath",
    externalLinks: [
      {
        label: "예시 리포트",
        url: "https://yyubin.github.io/hotpath/sample-report.html",
      },
    ],
    retrospective: {
      summary:
        "JMC나 벤치마크 리포트와 달리 '대표 수치만 빠르게 훑을 수 있는 단일 파일'이 필요했고, 단일 패스 파싱과 데이터·뷰 분리라는 두 원칙으로 그것을 만들었다. 나중에 쓸 분석 리포트를 미리 만들어두는 발상이 이 프로젝트의 시작점이었다.",
      learnings: [
        "JFR API는 타입 지정 accessor(getString, getClass 등)를 써야 내부 캐스팅 실패 없이 안전하게 필드를 읽을 수 있다. getValue()가 자연스러워 보이지만 RecordedClass 같은 타입에서는 예외가 발생한다.",
        "단일 패스 설계는 핸들러가 집계 상태만 유지하게 강제한다. 이 제약이 오히려 설계를 단순하게 만들었다. 전체를 메모리에 올리는 대신 각 핸들러가 필요한 것만 기억하면 됐다.",
        "JSON을 HTML에 주입하는 방식은 렌더링 로직을 Java에서 완전히 분리한다. 백엔드와 프론트엔드 사이에 명확한 계약(JSON 스키마)을 두면 양쪽이 독립적으로 발전할 수 있다는 것을 체감했다.",
      ],
    },
  },
  {
    id: "5",
    title: "Gesellschaft",
    slug: "gesellschaft",
    tldr: "림버스 컴퍼니 게임 데이터를 선언적 DSL(LPDL)로 기술하면 ANTLR 파서가 MySQL SQL과 Neo4j Cypher를 동시에 생성하는 컴파일러. 자연어 → LLM → LPDL 파이프라인까지 지원하며, 헥사고날 아키텍처 기반 도메인 모델(16 JPA 엔티티)을 갖춘 게임 데이터 아카이브 시스템입니다.",
    overview:
      "림버스 컴퍼니의 인격(Persona), 스킬, 패시브 데이터를 아카이브하는 Gesellschaft의 데이터 입력을 자동화하기 위해 개발한 DSL 컴파일러입니다. .lpdl 확장자의 선언적 언어로 게임 데이터를 기술하면 ANTLR 4 파서가 문법을 검증하고, MySQL INSERT SQL과 Neo4j Cypher를 동시에 생성합니다.\n\n자연어 → LLM(GPT-4) → LPDL 변환 파이프라인을 추가하여, 인격을 자연어로 설명하면 LPDL을 거쳐 데이터베이스 쿼리까지 자동으로 생성됩니다. 구문 오류 발생 시 오류 메시지를 LLM에게 피드백하여 자동 재시도하는 방식으로 안정성을 높였습니다.\n\n백엔드 도메인 모델은 헥사고날 아키텍처 기반으로 설계되었으며, 16개 JPA 엔티티로 구성된 복잡한 스킬·효과·조건 시스템을 표현합니다. 조건 시스템은 JOINED 상속 전략으로 구현된 재귀적 트리 구조로, AND/OR 조건 중첩과 무한 깊이 조건 트리를 지원합니다.",
    heroStats: [
      { label: "JPA 엔티티", value: "16개" },
      { label: "지원 DB", value: "MySQL + Neo4j" },
      { label: "컴파일 방식", value: "DSL / 자연어" },
      { label: "파서", value: "ANTLR 4" },
    ],
    achievements: [
      "ANTLR 4 기반 LPDL 문법 설계 및 파서 구현 (림버스 컴퍼니 스킬 시스템 전체 커버)",
      "Visitor 패턴 기반 MySQL SQL / Neo4j Cypher 동시 코드 생성",
      "LLM(GPT-4) 기반 자연어 → LPDL 변환 파이프라인 구현 (구문 오류 피드백 자동 재시도)",
      "Neo4j MERGE 최적화로 SinAffinity·StatusEffect 등 공유 노드 중복 방지",
      "헥사고날 아키텍처 기반 POJO 도메인 모델 ↔ JPA 엔티티 변환 설계",
      "PersonaJpa Aggregate Root 패턴 — CascadeType.ALL + orphanRemoval 생명주기 관리",
      "JOINED 상속 전략으로 재귀적 조건 트리(AbstractConditionJpa) 구현 (AND/OR 무한 중첩)",
      "triggerJson·amountJson 등 복잡한 객체의 JSON 직렬화 전략으로 테이블 수 최소화",
      "Jinx를 활용한 컴파일 타임 DDL 마이그레이션 자동화",
    ],
    techStack: [
      "Java 21",
      "ANTLR 4",
      "JPA / Hibernate",
      "MySQL",
      "Neo4j Cypher",
      "OpenAI GPT-4",
      "Picocli",
      "Gradle",
    ],
    relatedArticles: [],
    diagrams: [
      {
        title: "컴파일 파이프라인 (DSL / 자연어)",
        description:
          ".lpdl 직접 컴파일과 자연어 → LLM → LPDL 두 가지 입력 경로가 ANTLR 파서를 거쳐 MySQL SQL과 Neo4j Cypher를 동시에 생성하는 흐름",
        mermaidFile: "gesellschaft/compile-pipeline",
      },
      {
        title: "JPA 엔티티 계층 구조",
        description:
          "SinnerJpa → PersonaJpa(Aggregate Root) → Skill/Passive → Effect → Branch → Action의 계층과 JOINED 상속 기반 재귀 조건 트리 전체 구조",
        mermaidFile: "gesellschaft/entity-hierarchy",
      },
      {
        title: "Neo4j 그래프 모델",
        description:
          "Persona·Skill·Coin·Passive·Effect·Trigger·Action 노드와 HAS_SKILL·USES_SIN·TRIGGERS_ON·PERFORMS·APPLIES 관계 타입으로 구성된 시너지 분석용 그래프 스키마",
        mermaidFile: "gesellschaft/neo4j-graph-model",
      },
    ],
    githubUrl: "https://github.com/yyubin/lpdlc",
    retrospective: {
      summary:
        "림버스 컴퍼니 데이터를 직접 입력하는 것이 너무 번거로워서 DSL을 만들었고, 거기에 자연어 입력까지 붙였다. 컴파일러를 만들면서 데이터 구조를 언어로 표현한다는 것의 어려움과 재미를 동시에 느꼈다.",
      learnings: [
        "ANTLR 문법 설계는 데이터 구조를 얼마나 잘 이해하느냐가 핵심이다. 스킬 시스템을 DSL로 표현하면서 데이터 간 관계를 명확히 정리하지 않으면 문법이 점점 복잡해진다는 것을 배웠다.",
        "LLM을 파이프라인 중간에 끼우면 구문 오류가 발생한다. 오류 메시지를 LLM에게 그대로 피드백하는 방식이 가장 효과적이었고, 재시도 횟수와 피드백 품질이 성공률을 결정한다는 것을 알았다.",
        "Neo4j에서 SinAffinity, StatusEffect 같은 공유 개념은 MERGE로 관리해야 한다. 처음에 CREATE로 모두 만들었다가 중복 노드 문제가 생겼고, MERGE 전략으로 전환하면서 그래프 설계의 멱등성 개념을 이해했다.",
      ],
    },
  },
  {
    id: "6",
    title: "Accord",
    slug: "accord",
    role: "팀장 (5인 팀)",
    tldr: "Figma·Discord·Notion을 하나로 통합한 개발자 협업 플랫폼. WebRTC 시그널링·STUN·TURN 서버를 직접 구현하고, Spring Boot + Go 폴리글랏 마이크로서비스에 Consul 서비스 디스커버리를 연동했습니다.",
    overview:
      "팀 협업에 필요한 도구가 Figma, Discord, Notion 등으로 분산되어 있다는 문제에서 출발한 개발자 협업 플랫폼입니다. 캔버스, 실시간 채팅, 음성 통화, 칸반 보드, 팀 노트를 하나의 플랫폼에서 제공합니다. 5인 팀이 5주간 개발했으며 2025년 2월에 배포했습니다.\n\nSpring Boot 메인 백엔드와 Go(Fiber) 특화 서비스로 역할을 분리하는 폴리글랏 마이크로서비스 구조로 설계했습니다. WebRTC 실시간 통신을 위해 Node.js WebSocket 시그널링 서버, Go + Pion 기반 STUN·TURN 서버를 직접 구현했습니다. Consul 서비스 디스커버리로 각 서비스가 API Gateway를 통해 동적으로 라우팅되며, Prometheus + Grafana로 전체 서비스를 모니터링합니다.",
    heroStats: [
      { label: "팀 규모", value: "5인" },
      { label: "개발 기간", value: "5주" },
      { label: "마이크로서비스", value: "7개" },
      { label: "배포", value: "2025.02" },
    ],
    achievements: [
      "WebSocket 기반 시그널링 서버 구현 — subscribe/publish/unsubscribe 토픽 구조로 다중 피어 Offer/Answer 교환 처리",
      "Go + Pion 라이브러리로 STUN 서버 직접 구현 (UDP, XOR-MAPPED-ADDRESS 응답)",
      "Go + Pion으로 TURN 서버 구현 — STUN으로 NAT 통과 실패 시 릴레이 연결 제공",
      "Consul 서비스 디스커버리 연동 — 시그널링 서버 자동 등록 및 SIGINT/SIGTERM 시 graceful 해제",
      "Spring Boot + Go(Fiber) 폴리글랏 마이크로서비스 — 역할별 언어 분리 (팀관리·칸반·채팅 vs 노트·캔버스·오디오)",
      "gRPC 기반 서비스 간 공개키 로테이션 구현",
      "RabbitMQ 기반 실시간 채팅 메시징 파이프라인 구성",
      "MariaDB(관계형) + MongoDB(문서) 폴리글랏 퍼시스턴스 설계",
      "Prometheus 메트릭 수집 + Grafana 대시보드로 전 서비스 모니터링 구성",
      "GitHub Actions + Docker 기반 CI/CD 파이프라인 구축",
    ],
    techStack: [
      "Spring Boot (Java)",
      "Go (Fiber)",
      "Node.js",
      "React",
      "WebRTC",
      "Pion",
      "MariaDB",
      "MongoDB",
      "Redis",
      "RabbitMQ",
      "gRPC",
      "Consul",
      "AWS (S3 · EC2)",
      "Prometheus / Grafana",
      "Docker",
      "GitHub Actions",
    ],
    relatedArticles: [],
    diagrams: [
      {
        title: "전체 시스템 아키텍처",
        description:
          "API Gateway → Spring Backend / Go Backend 폴리글랏 마이크로서비스 구조와 WebRTC 인프라(시그널링·STUN·TURN), Consul 서비스 디스커버리, S3·RabbitMQ·Prometheus 연동 전체 구성",
        mermaidFile: "accord/system-architecture",
      },
      {
        title: "WebRTC 연결 플로우",
        description:
          "시그널링 서버를 통한 Offer/Answer 교환, STUN으로 공인 IP 획득, P2P 직접 연결 성공/실패에 따른 TURN 릴레이 폴백까지의 ICE 협상 전체 흐름",
        mermaidFile: "accord/webrtc-flow",
      },
      {
        title: "Consul 서비스 메시",
        description:
          "Spring Backend·Go Backend·시그널링 서버가 Consul에 자동 등록하고 API Gateway가 이를 조회해 라우팅하는 서비스 디스커버리 구조와 Prometheus 메트릭 수집 흐름",
        mermaidFile: "accord/service-mesh",
      },
    ],
    githubUrl: "https://github.com/no-team-name",
    retrospective: {
      summary:
        "WebRTC를 처음 다뤄봤는데, 시그널링·ICE·STUN·TURN이 각각 어떤 역할인지 실제로 구현해보기 전까지는 감이 잡히지 않았다. 서버를 직접 만들면서 WebRTC가 왜 이렇게 복잡하게 설계됐는지를 이해했다.",
      learnings: [
        "WebRTC 연결이 실패하는 이유의 대부분은 NAT다. STUN은 공인 IP를 알려줄 뿐이고, 대칭형 NAT 환경에서는 결국 TURN 릴레이가 필요하다. 이를 직접 구현하면서 ICE 협상 과정 전체를 코드 레벨에서 이해하게 됐다.",
        "Consul 서비스 디스커버리를 쓰면서 서비스가 죽을 때 자동으로 해제되는 것이 얼마나 중요한지 알았다. SIGINT/SIGTERM 핸들러에서 Consul 해제를 빠뜨리면 API Gateway가 존재하지 않는 서비스로 계속 요청을 보낸다.",
        "Spring과 Go를 함께 쓰는 폴리글랏 구조는 언어 선택의 자유를 주지만, 서비스 간 계약(gRPC 스키마, API 규격)을 팀 전체가 공유하지 않으면 통합 시점에 병목이 생긴다. 계약을 먼저 정의하고 구현하는 순서가 중요하다는 것을 배웠다.",
      ],
    },
  },
  {
    id: "7",
    title: "Durcit",
    slug: "durcit",
    role: "팀장 (4인 팀) — 인증·API 설계·DB·S3·AOP 로깅·WebSocket/RabbitMQ·배포 담당",
    tldr: "Reddit에서 영감을 받은 게임 커뮤니티 플랫폼. JWT + OAuth2 인증, WebSocket + RabbitMQ 실시간 채팅, CachedBodyHttpServletRequest를 활용한 AOP API 로깅, DB 기반 푸시 알림 시스템을 직접 구현했습니다.",
    overview:
      "게이머들이 게임 경험과 콘텐츠를 자유롭게 공유할 수 있는 Reddit 스타일 커뮤니티 플랫폼입니다. 태그 기반 피드, 댓글 멘션, 실시간 채팅, 개인화 알림, 관리자 대시보드를 제공하며 AWS에 배포되어 운영되고 있습니다.\n\n인증 시스템은 JWT Stateless 방식으로 설계했으며, ADMIN·MANAGER·MEMBER 역할 기반 접근 제어와 OAuth2 소셜 로그인을 함께 지원합니다. 실시간 채팅은 WebSocket(STOMP) + RabbitMQ 메시지 브로커 구조로 구현했고, AOP 로깅은 HttpServletRequest 바디를 다중 읽기 가능하게 래핑하는 CachedBodyHttpServletRequest 패턴으로 스트림 소모 문제를 해결했습니다.",
    heroStats: [
      { label: "팀 규모", value: "4인" },
      { label: "주요 기능", value: "8가지" },
      { label: "실시간", value: "WebSocket + RabbitMQ" },
      { label: "인증", value: "JWT + OAuth2" },
    ],
    achievements: [
      "JWT Stateless 인증 + BCrypt 패스워드 인코딩 + OAuth2 소셜 로그인 구현",
      "Spring Security RBAC — ADMIN / MANAGER / MEMBER 역할별 엔드포인트 접근 제어",
      "CachedBodyHttpServletRequest 래퍼로 요청 바디 다중 읽기 문제 해결 후 AOP API 로깅 구현",
      "WebSocket(STOMP) + RabbitMQ AMQP 기반 실시간 채팅 메시지 브로커 구조 구현",
      "DB 기반 푸시 알림 시스템 — 팔로우 사용자 게시글·댓글·채팅 이벤트별 PushType 분류",
      "AWS S3 프로필 이미지·게시글 미디어 업로드 연동",
      "AWS EC2 + RDS + Route 53 + Nginx 리버스 프록시 배포 구성",
      "관리자 대시보드 — 활동 로그 조회, 역할 관리, 게시물 공개 제어, 사용자 차단",
      "SpringDoc OpenAPI 기반 Swagger API 문서 자동화",
    ],
    techStack: [
      "Spring Boot 3.4 (Java 21)",
      "Spring Security",
      "JWT (JJWT)",
      "OAuth2",
      "WebSocket / STOMP",
      "RabbitMQ",
      "Spring Data JPA",
      "MySQL",
      "AWS (S3 · EC2 · RDS · Route 53)",
      "Nginx",
      "React.js",
      "Tailwind CSS",
      "TestContainers",
    ],
    relatedArticles: [],
    diagrams: [
      {
        title: "전체 시스템 아키텍처",
        description:
          "React 클라이언트 → Nginx → Spring Boot 레이어 구성과 WebSocket/RabbitMQ 채팅, AOP 로깅, 푸시 알림, AWS(RDS·S3) 연동 전체 구조",
        mermaidFile: "durcit/system-architecture",
      },
      {
        title: "WebSocket + RabbitMQ 실시간 채팅",
        description:
          "JWT 인증 후 STOMP 구독, 메시지 발행 시 RabbitMQ AMQP를 거쳐 채팅방 구독자 전체에 브로드캐스트되는 실시간 메시징 흐름과 오프라인 푸시 알림 저장",
        mermaidFile: "durcit/realtime-messaging",
      },
      {
        title: "AOP API 로깅 흐름",
        description:
          "CachedBodyHttpServletRequest가 요청 바디를 캐싱하여 다중 읽기를 허용하고, ApiLoggingAspect가 컨트롤러 실행 전후 요청·응답 정보를 추출해 DB에 저장하는 구조",
        mermaidFile: "durcit/aop-logging",
      },
    ],
    githubUrl: "https://github.com/DURCIT",
    externalLinks: [],
    retrospective: {
      summary:
        "기능을 많이 만들기보다 각 기능이 어떻게 동작하는지 이해하면서 만들려고 했다. AOP 로깅에서 HttpServletRequest 스트림 소모 문제를 만났을 때, 래퍼 클래스로 해결하는 과정이 가장 인상 깊었다.",
      learnings: [
        "HttpServletRequest 바디는 한 번만 읽을 수 있다. AOP에서 로깅을 위해 읽으면 이후 컨트롤러가 빈 바디를 받는다. CachedBodyHttpServletRequest로 래핑해 바이트 배열에 캐싱해두면 다중 읽기가 가능해진다. 프레임워크의 추상화 뒤에 있는 서블릿 스펙을 직접 다루는 경험이었다.",
        "RabbitMQ를 처음 써봤는데, WebSocket만으로 채팅을 구현하면 서버가 직접 모든 클라이언트 연결을 관리해야 한다. 메시지 브로커를 두면 발행과 구독이 분리되어 서버 부담이 줄고 확장도 쉬워진다. 메시지 큐의 필요성을 실제 문제로 이해했다.",
        "JWT는 Stateless라는 장점이 있지만, Refresh Token 관리와 강제 로그아웃 처리를 직접 설계해야 한다. 토큰 무효화 전략을 어떻게 구성하느냐에 따라 구현 복잡도가 크게 달라진다는 것을 체감했다.",
      ],
    },
  },
];
