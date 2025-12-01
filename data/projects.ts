import { Project } from '@/types';

export const projects: Project[] = [
  {
    id: '1',
    title: 'Sprout',
    slug: 'sprout',
    tldr: 'Spring Boot의 핵심 기능(IoC/DI, AOP, MVC)을 직접 구현한 경량 웹 프레임워크. 비동기 논블로킹 NIO 서버와 WebSocket을 직접 구현하고, JIT 컴파일러 최적화를 통해 응답 안정성을 29% 향상시켰습니다.',
    overview: 'Spring Boot의 핵심 기능을 직접 구현하여 프레임워크 내부 동작 원리를 깊이 이해하고자 시작한 프로젝트입니다. IoC/DI 컨테이너, AOP 프록시, MVC 패턴을 밑바닥부터 구현하며 Spring의 설계 철학을 체득했습니다. 또한 비동기 논블로킹 서버 아키텍처를 설계하고 WebSocket 실시간 통신 프로토콜을 직접 구현했습니다.',
    heroStats: [
      { label: '성능 향상', value: '29%' },
      { label: '테스트 커버리지', value: '85%+' },
      { label: '단위 테스트', value: '673개' },
      { label: '기술 블로그 글', value: '13편' },
    ],
    achievements: [
      'Java Reflection과 CGLIB를 활용한 커스텀 IoC/DI 컨테이너 구현',
      '프록시 패턴 기반의 AOP(관점 지향 프로그래밍) 구현',
      'Annotation 기반 MVC 프레임워크 및 DispatcherServlet 구현',
      'NIO Selector와 이벤트 루프 기반의 비동기 논블로킹 HTTP 서버 구현',
      'WebSocket 프로토콜 직접 구현으로 실시간 양방향 통신 지원',
      'async-profiler, JMC, JITWatch를 활용한 성능 분석 및 최적화',
      'JIT 컴파일러 친화적 코드 리팩토링으로 응답 안정성 29% 향상',
      '673개 단위 테스트 작성 (라인 커버리지 85%+)',
    ],
    techStack: [
      'Java 21',
      'Reflection API',
      'CGLIB',
      'NIO (Non-blocking I/O)',
      'WebSocket',
      'JUnit 5',
      'async-profiler',
      'JMC (Java Mission Control)',
      'JITWatch',
    ],
    relatedArticles: [
      { title: 'Annotation과 Reflection, 메타 프로그래밍 시작기', section: 'articles', slug: 'sprout1' },
      { title: 'DI/IoC 컨테이너의 태동', section: 'articles', slug: 'sprout2' },
      { title: 'DispatcherServlet의 본질', section: 'articles', slug: 'sprout3' },
      { title: 'ArgumentResolver를 직접 구현하며 배운 것들', section: 'articles', slug: 'sprout4' },
      { title: 'AOP 만들기 (1) — 프록시와 인터셉션', section: 'articles', slug: 'sprout5' },
      { title: 'AOP 만들기 (2) — 어드바이스/포인트컷을 구현하며', section: 'articles', slug: 'sprout6' },
      { title: '커스텀 서버의 첫 성능 실험', section: 'articles', slug: 'sprout7' },
      { title: 'DI/IoC 컨테이너 아키텍처 재설계 (1)', section: 'articles', slug: 'sprout8' },
      { title: 'DI/IoC 컨테이너 아키텍처 재설계 (2)', section: 'articles', slug: 'sprout9' },
      { title: '커스텀 Non-Blocking I/O 서버 아키텍처 전체 해부', section: 'articles', slug: 'sprout10' },
      { title: 'async-profiler로 서버의 병목을 추적하다', section: 'articles', slug: 'sprout11' },
      { title: 'JMC + JITWatch로 본 JIT 컴파일의 세계', section: 'articles', slug: 'sprout12' },
      { title: '성능 개선 리팩토링 — JIT 친화적 서버로 만들기', section: 'articles', slug: 'sprout13' },
    ],
    diagrams: [
      {
        title: '컨테이너 초기화 & 빈 생명주기',
        description: 'SproutApplicationContext가 초기화되면서 Phase 별로 빈을 생성하는 전체 과정',
        mermaidCode: `flowchart TB
    START[SproutApplication.run]
    CONTEXT[ApplicationContext 생성]
    REFRESH[refresh 시작]

    subgraph SCAN["1️⃣ 컴포넌트 스캔"]
        R1[Reflections 라이브러리로<br/>@Component 등 스캔]
        R2[BeanDefinition 생성]
        R3[BeanGraph 구축<br/>위상 정렬]
    end

    subgraph PHASES["2️⃣ 생명주기 Phase 실행"]
        P1[Infrastructure Bean<br/>order=100]
        P2[BeanPostProcessor 등록<br/>order=200]
        P3[Application Bean<br/>order=300]
        P4[ContextInitializer<br/>order=400]
    end

    subgraph DETAIL["빈 생성 상세"]
        D1{Strategy 선택}
        D2[Constructor 기반]
        D3[FactoryMethod 기반]
        D4[DependencyResolver<br/>의존성 주입]
        D5[BeanPostProcessor<br/>후처리]
    end

    START --> CONTEXT
    CONTEXT --> REFRESH
    REFRESH --> SCAN

    R1 --> R2
    R2 --> R3

    SCAN --> PHASES

    P1 --> P2
    P2 --> P3
    P3 --> P4

    P3 -.빈 생성.-> DETAIL

    D1 --|Component|--> D2
    D1 --|Bean method|--> D3
    D2 --> D4
    D3 --> D4
    D4 --> D5

    style SCAN fill:#e3f2fd
    style PHASES fill:#fff3e0
    style DETAIL fill:#f3e5f5
    style P3 fill:#ffb74d,color:#000`,
      },
      {
        title: '빈 생성 전략 패턴 (Strategy Pattern)',
        description: 'BeanDefinition의 생성 방식에 따라 적절한 전략을 선택하여 빈을 인스턴스화하는 과정',
        mermaidCode: `sequenceDiagram
    participant BF as BeanFactory
    participant FS as findStrategy()
    participant CS as ConstructorStrategy
    participant FM as FactoryMethodStrategy
    participant DR as DependencyResolver<br/>(Chain of Responsibility)
    participant PP as BeanPostProcessor

    Note over BF: createBean(BeanDefinition) 호출

    BF->>FS: 생성 방식 확인

    alt CONSTRUCTOR 방식
        FS->>CS: supports(CONSTRUCTOR)?
        CS-->>FS: true
        FS-->>BF: ConstructorStrategy 반환

        BF->>DR: resolve 의존성
        DR->>DR: SingleBeanResolver<br/>ListBeanResolver 체인
        DR-->>BF: Object[] deps

        BF->>CS: instantiate(def, deps)
        CS->>CS: constructor.newInstance(deps)
        CS-->>BF: 빈 인스턴스

    else FACTORY_METHOD 방식
        FS->>FM: supports(FACTORY_METHOD)?
        FM-->>FS: true
        FS-->>BF: FactoryMethodStrategy 반환

        BF->>BF: getBean(factoryBeanName)<br/>@Configuration 인스턴스
        BF->>DR: resolve 메서드 파라미터
        DR-->>BF: Object[] deps

        BF->>FM: instantiate(def, deps)
        FM->>FM: method.invoke(factoryBean, deps)
        FM-->>BF: 빈 인스턴스
    end

    Note over BF,PP: 3️⃣ 후처리
    BF->>PP: postProcessBeforeInit
    PP-->>BF: 처리된 빈
    BF->>PP: postProcessAfterInit
    PP-->>BF: 최종 빈 (프록시 가능)

    BF->>BF: singletonObjects에 저장`,
      },
      {
        title: '위상 정렬 & 순환 의존성 감지 (Kahn\'s Algorithm)',
        description: 'BFS 기반 위상 정렬로 빈 생성 순서를 결정하고 순환 의존성을 사전 감지',
        mermaidCode: `flowchart TB
    START[BeanGraph 생성]

    subgraph BUILD["1️⃣ 그래프 구축"]
        B1[모든 BeanDefinition<br/>수집]
        B2[의존성 타입 추출<br/>Constructor/FactoryMethod]
        B3["edges: A→B (A가 B에 의존)<br/>indegree[B]++"]
    end

    subgraph KAHN["2️⃣ Kahn's Algorithm"]
        K1["Queue에 추가<br/>indegree == 0인 빈들"]
        K2{Queue 비었나?}
        K3[빈 poll]
        K4["의존하는 빈들의<br/>indegree--"]
        K5{indegree == 0?}
        K6[Queue에 추가]
        K7[ordered 리스트에 추가]
    end

    subgraph CHECK["3️⃣ 순환 감지"]
        C1{ordered.size ==<br/>nodeMap.size?}
        C2[✅ 정상<br/>빈 생성 시작]
        C3[❌ CircularDependency<br/>Exception 발생]
    end

    START --> BUILD
    B1 --> B2
    B2 --> B3

    BUILD --> KAHN
    K1 --> K2
    K2 -->|No| K3
    K3 --> K4
    K4 --> K5
    K5 -->|Yes| K6
    K5 -->|No| K2
    K6 --> K2
    K3 --> K7
    K7 --> K2

    K2 -->|Yes| CHECK

    C1 -->|Yes| C2
    C1 -->|No| C3

    style BUILD fill:#e1f5fe
    style KAHN fill:#fff3e0
    style CHECK fill:#ffebee
    style C2 fill:#81c784,color:#000
    style C3 fill:#e57373,color:#fff`,
      },
      {
        title: 'AOP 초기화 & Advisor 생성',
        description: '@Aspect 클래스를 스캔하여 Advisor를 생성하고 AdvisorRegistry에 등록하는 과정',
        mermaidCode: `flowchart TB
    START[애플리케이션 시작]

    subgraph INFRA["1️⃣ 인프라 빈 생성<br/>(order=100)"]
        I1[AspectPostProcessor]
        I2[AdvisorRegistry]
        I3[AdviceFactory]
        I4[PointcutFactory]
        I5[CglibProxyFactory]
    end

    subgraph INIT["2️⃣ AOP 초기화<br/>(PostInfrastructureInitializer)"]
        N1[AopPostInfrastructure<br/>Initializer 실행]
        N2[AspectPostProcessor에<br/>basePackages 전달]
        N3[Aspect 클래스 스캔]
    end

    subgraph SCAN["3️⃣ Advisor 생성"]
        S1[각 Aspect 메서드 분석]
        S2{어노테이션?}
        S3[Before]
        S4[After]
        S5[Around]
    end

    subgraph BUILD["4️⃣ AdviceBuilder 실행"]
        B1[파라미터 검증]
        B2[PointcutFactory로<br/>Pointcut 생성]
        B3[Advice 인터셉터 생성<br/>Before/After/Around]
        B4[DefaultAdvisor 조립<br/>Pointcut+Advice+Order]
    end

    subgraph REGISTRY["5️⃣ AdvisorRegistry"]
        R1[Advisor 등록]
        R2[Order 기준 정렬]
        R3[캐시 초기화]
    end

    START --> INFRA
    I1 --> I2
    I2 --> I3
    I3 --> I4
    I4 --> I5

    INFRA --> INIT
    N1 --> N2
    N2 --> N3

    INIT --> SCAN
    S1 --> S2
    S2 -->|Before| S3
    S2 -->|After| S4
    S2 -->|Around| S5

    S3 --> BUILD
    S4 --> BUILD
    S5 --> BUILD

    B1 --> B2
    B2 --> B3
    B3 --> B4

    BUILD --> REGISTRY
    R1 --> R2
    R2 --> R3

    style INFRA fill:#e3f2fd
    style INIT fill:#fff3e0
    style SCAN fill:#f3e5f5
    style BUILD fill:#e8f5e9
    style REGISTRY fill:#fce4ec`,
      },
      {
        title: 'AOP 프록시 생성 & 적용',
        description: 'BeanPostProcessor가 빈 생성 시점에 Pointcut 매칭을 확인하고 프록시를 생성하는 과정',
        mermaidCode: `sequenceDiagram
    participant BF as BeanFactory
    participant PP as AspectPostProcessor<br/>(BeanPostProcessor)
    participant REG as AdvisorRegistry
    participant PF as CglibProxyFactory

    Note over BF: Application Bean 생성<br/>(order=300)

    BF->>BF: 1. createBean(UserService)
    BF->>BF: 2. 생성자로 인스턴스화
    BF->>BF: 3. 의존성 주입 완료

    Note over BF,PP: 4️⃣ BeanPostProcessor 실행

    BF->>PP: postProcessAfterInitialization<br/>(beanName, userServiceBean)

    PP->>PP: UserService의 모든 메서드 순회

    loop 각 메서드마다
        PP->>REG: getApplicableAdvisors<br/>(UserService.class, method)

        REG->>REG: 캐시 확인

        alt 캐시 미스
            REG->>REG: 모든 Advisor의<br/>Pointcut.matches() 체크
            REG->>REG: 결과 캐싱
        end

        REG-->>PP: List<Advisor>
    end

    alt 적용할 Advisor 있음
        PP->>PP: needsProxy = true

        Note over PP,PF: 5️⃣ CGLIB 프록시 생성

        PP->>PF: createProxy(UserService,<br/>bean, registry, ctorMeta)

        PF->>PF: Enhancer.setSuperclass<br/>(UserService.class)
        PF->>PF: Enhancer.setCallback<br/>(BeanMethodInterceptor)
        PF->>PF: Enhancer.create()

        PF-->>PP: 프록시 객체

        PP-->>BF: 프록시 반환
        BF->>BF: 프록시를 싱글톤 캐시에 저장
    else 적용할 Advisor 없음
        PP-->>BF: 원본 빈 그대로 반환
    end`,
      },
      {
        title: 'AOP 런타임: Advice 체인 실행',
        description: '프록시 메서드 호출 시 BeanMethodInterceptor가 Advice 체인을 순차적으로 실행하는 과정',
        mermaidCode: `sequenceDiagram
    participant Client as 클라이언트
    participant Proxy as UserService<br/>(프록시)
    participant INT as BeanMethodInterceptor
    participant INV as MethodInvocation
    participant ADV1 as AroundAdvice<br/>(로깅)
    participant ADV2 as BeforeAdvice<br/>(트랜잭션)
    participant Target as UserService<br/>(실제 객체)

    Client->>Proxy: saveUser(user)

    Note over Proxy,INT: 1️⃣ 프록시 진입

    Proxy->>INT: intercept(obj, method, args)

    INT->>INT: AdvisorRegistry에서<br/>적용 가능한 Advisor 목록 조회

    alt Advisor 없음
        INT->>Target: 원본 메서드 직접 호출
        Target-->>Client: 결과 반환
    else Advisor 있음
        Note over INT,INV: 2️⃣ MethodInvocation 생성

        INT->>INV: new MethodInvocation<br/>(target, method, args, advisors)

        Note over INV,ADV1: 3️⃣ Advice 체인 실행

        INV->>INV: proceed() 호출
        INV->>ADV1: invoke(invocation)

        Note over ADV1: Around: 실행 전 로직

        ADV1->>ADV1: long start = now()
        ADV1->>INV: invocation.proceed()

        INV->>INV: currentAdvisorIndex++
        INV->>ADV2: invoke(invocation)

        Note over ADV2: Before: 사전 로직

        ADV2->>ADV2: logBefore(joinPoint)
        ADV2->>INV: invocation.proceed()

        Note over INV,Target: 4️⃣ 실제 메서드 실행

        INV->>Target: saveUser(user)
        Target-->>INV: 결과

        Note over ADV2: Before: 사후 처리 없음

        INV-->>ADV1: 결과

        Note over ADV1: Around: 실행 후 로직

        ADV1->>ADV1: long elapsed = now() - start
        ADV1->>ADV1: log("Elapsed: " + elapsed)
        ADV1-->>INT: 결과

        INT-->>Proxy: 결과
        Proxy-->>Client: 최종 결과
    end`,
      },
      {
        title: 'HTTP 요청 처리 플로우 (Pure NIO)',
        description: 'Selector 기반 이벤트 루프에서 HTTP 요청을 받아 처리하고 응답하는 전체 과정',
        mermaidCode: `sequenceDiagram
    participant C as Client
    participant S as Selector<br/>(I/O Thread)
    participant CM as ConnectionManager
    participant PD as ProtocolDetector
    participant HC as HttpConnectionHandler
    participant W as Worker Thread
    participant D as Dispatcher

    Note over S: 1. 서버 시작 & OP_ACCEPT 등록
    C->>S: 연결 요청
    S->>CM: OP_ACCEPT 이벤트
    CM->>C: SocketChannel 생성<br/>(Non-blocking)

    Note over CM,PD: 2. 프로토콜 감지
    CM->>PD: 초기 바이트 분석
    PD-->>CM: "HTTP/1.1" 감지

    Note over CM,HC: 3. 핸들러 등록
    CM->>HC: HttpConnectionHandler 생성
    CM->>S: OP_READ 등록 + 핸들러 첨부

    C->>S: HTTP 요청 전송
    S->>HC: OP_READ 이벤트
    HC->>HC: ByteBuffer로 읽기<br/>(Non-blocking)

    Note over HC: 4. 요청 완료 체크
    HC->>HC: isRequestComplete()?

    Note over HC,W: 5. 워커 스레드에 위임
    HC->>S: interestOps(0)<br/>(이벤트 감지 중단)
    HC->>W: 요청 처리 태스크 제출

    W->>D: 요청 파싱 & 디스패치
    D->>D: 컨트롤러 실행
    D-->>W: HttpResponse 생성

    Note over W,HC: 6. 응답 준비
    W->>HC: ByteBuffer로 변환
    HC->>S: OP_WRITE 등록<br/>selector.wakeup()

    S->>HC: OP_WRITE 이벤트
    HC->>C: 응답 전송<br/>(Non-blocking)

    Note over HC: 7. 연결 종료
    HC->>S: close() & 무효화`,
      },
      {
        title: 'I/O Thread vs Worker Thread 구조',
        description: '이벤트 루프(I/O Thread)와 비즈니스 로직 처리(Worker Thread)의 역할 분리',
        mermaidCode: `flowchart TB
    subgraph IO["I/O Thread (Event Loop)"]
        SEL[Selector]
        ACCEPT[OP_ACCEPT<br/>연결 수락]
        READ[OP_READ<br/>데이터 읽기]
        WRITE[OP_WRITE<br/>응답 전송]
    end

    subgraph WORKER["Worker Thread Pool"]
        VT[Virtual Threads /<br/>Platform Threads]
        PARSE[요청 파싱]
        DISPATCH[디스패처]
        CTRL[컨트롤러 실행]
        RESP[응답 생성]
    end

    SEL --> ACCEPT
    SEL --> READ
    SEL --> WRITE

    READ -.비동기 제출.-> VT
    VT --> PARSE
    PARSE --> DISPATCH
    DISPATCH --> CTRL
    CTRL --> RESP
    RESP -.완료 알림.-> WRITE

    style IO fill:#e1f5ff
    style WORKER fill:#fff4e1
    style SEL fill:#4fc3f7,color:#000
    style VT fill:#ffb74d,color:#000`,
      },
      {
        title: '프로토콜 라우팅 (WebSocket vs HTTP)',
        description: 'WebSocket은 항상 NIO로, HTTP는 서버 모드에 따라 NIO 또는 BIO로 처리',
        mermaidCode: `flowchart TD
    START[새 연결 수락<br/>OP_ACCEPT]
    DETECT{프로토콜 감지}

    WS_CHECK{Upgrade:<br/>websocket?}

    HTTP_HANDLER[NioHttpProtocolHandler /<br/>BioHttpProtocolHandler]
    WS_HANDLER[NioWebSocketProtocolHandler<br/>항상 NIO]

    MODE{서버 모드?}

    NIO[Pure NIO<br/>NioHttpProtocolHandler]
    BIO[Hybrid<br/>BioHttpProtocolHandler]

    START --> DETECT
    DETECT --> WS_CHECK

    WS_CHECK -->|Yes| WS_HANDLER
    WS_CHECK -->|No| MODE

    MODE -->|nio| NIO
    MODE -->|hybrid| BIO

    WS_HANDLER --> WS_END[NIO 기반<br/>실시간 통신]
    NIO --> NIO_END[이벤트 루프<br/>상태 관리]
    BIO --> BIO_END[워커 스레드<br/>Blocking I/O]

    style WS_HANDLER fill:#81c784
    style WS_END fill:#81c784
    style NIO fill:#64b5f6
    style BIO fill:#ffb74d`,
      },
    ],
    githubUrl: 'https://github.com/yyubin/sprout',
  },
  {
    id: '2',
    title: 'Jinx',
    slug: 'jinx',
    tldr: 'JPA Entity 변경을 자동으로 추적하여 데이터베이스 마이그레이션 DDL을 생성하는 도구. Annotation Processor를 활용하여 컴파일 시점에 스키마를 분석하고, Liquibase 호환 포맷으로 마이그레이션 파일을 자동 생성합니다.',
    overview: 'JPA를 사용하는 프로젝트에서 Entity 변경 시 수동으로 마이그레이션 파일을 작성하는 번거로움을 해결하기 위해 개발한 도구입니다. Java Annotation Processor를 활용하여 컴파일 타임에 Entity를 분석하고, 스키마 변경사항을 자동으로 감지하여 DDL과 롤백 SQL을 생성합니다.',
    heroStats: [
      { label: 'Maven Central', value: 'v0.0.13' },
      { label: '배포 형태', value: '오픈소스' },
      { label: '지원 형식', value: 'Liquibase' },
      { label: '분석 방식', value: '컴파일 타임' },
    ],
    reflectionArticle: {
      title: 'Jinx 개발 회고',
      slug: 'jinx',
      description: 'JPA 애노테이션으로 DB 마이그레이션을 자동화하는 과정에서 겪은 문제와 해결 과정',
    },
    achievements: [
      'Java Annotation Processor를 활용한 컴파일 타임 Entity 분석',
      '스키마 스냅샷 자동 생성 및 Diff 알고리즘 구현',
      '테이블, 컬럼, 제약조건 등 모든 스키마 변경사항 자동 감지',
      'DDL 및 롤백 SQL 자동 생성',
      'Liquibase 형식 호환 YAML 출력으로 기존 도구와 연동 가능',
      '멀티 모듈 구조로 설계하여 Maven Central에 정식 배포 (v0.0.13)',
      '프로덕션 환경에서 안전한 마이그레이션 관리 지원',
    ],
    techStack: [
      'Java',
      'Annotation Processor',
      'JPA',
      'Liquibase',
      'Maven',
      'Schema Diff Algorithm',
    ],
    relatedArticles: [
      { title: '사이드 프로젝트에 Jinx 적용 후기', section: 'til', slug: 'jinx-user-review' },
    ],
    githubUrl: 'https://github.com/yyubin/jinx',
  },
];
