import { Article } from '@/types';

export const articlePosts: Article[] = [
    {
        id: "1",
        title: "Annotation과 Reflection, 메타 프로그래밍 시작기",
        subtitle: "RequestMapping은 내부에서 어떻게 동작할까?",
        date: "2025-06-06T14:28:00",
        tags: ['spring', 'sprout', 'reflection'],
        slug: 'sprout1',
        contentPath: '/content/articles/sprout1.md'
    },
    {
        id: "2",
        title: "DI/IoC 컨테이너의 태동",
        subtitle: "스프링 의존성 주입의 핵심 구조를 직접 구현해보며",
        date: "2025-06-18T14:28:00",
        tags: ['spring', 'sprout', 'DI', 'IoC'],
        slug: 'sprout2',
        contentPath: '/content/articles/sprout2.md'
    },
    {
        id: "3",
        title: "DispatcherServlet의 본질",
        subtitle: "애노테이션 기반 컨트롤러 매핑을 바닥부터 만들어본 기록",
        date: "2025-06-26T14:28:00",
        tags: ['spring', 'sprout', 'dispatcherServlet', 'controller'],
        slug: 'sprout3',
        contentPath: '/content/articles/sprout3.md'
    },    
    {
        id: "4",
        title: "ArgumentResolver를 직접 구현하며 배운 것들",
        subtitle: "스프링 MVC의 파라미터 바인딩은 어떻게 작동하는가",
        date: "2025-07-04T14:28:00",
        tags: ['spring', 'sprout', 'ArgumentResolver', 'MVC'],
        slug: 'sprout4',
        contentPath: '/content/articles/sprout4.md'
    },
    {
        id: "5",
        title: "AOP 만들기 (1) — 프록시와 인터셉션",
        subtitle: "스프링 AOP를 구성하는 최소 단위를 직접 구현",
        date: "2025-08-22T14:28:00",
        tags: ['spring', 'sprout', 'AOP'],
        slug: 'sprout5',
        contentPath: '/content/articles/sprout5.md'
    },
    {
        id: "6",
        title: "AOP 만들기 (2) — 어드바이스/포인트컷을 구현하며",
        subtitle: "조인포인트를 둘러싼 스프링의 설계 철학 엿보기",
        date: "2025-10-09T14:28:00",
        tags: ['spring', 'sprout', 'AOP'],
        slug: 'sprout6',
        contentPath: '/content/articles/sprout6.md'
    },
    {
        id: "7",
        title: "커스텀 서버의 첫 성능 실험",
        subtitle: "BIO/NIO 구성에 따른 처리량과 안정성 측정기",
        date: "2025-10-15T14:28:00",
        tags: ['spring', 'sprout', 'http', 'nio', 'bio'],
        slug: 'sprout7',
        contentPath: '/content/articles/sprout7.md'
    },
    {
        id: "8",
        title: "DI/IoC 컨테이너 아키텍처 재설계 (1)",
        subtitle: "Bean 스캐닝부터 초기화까지의 전체 흐름 정리",
        date: "2025-10-21T14:28:00",
        tags: ['spring', 'sprout', 'DI', 'IoC'],
        slug: 'sprout8',
        contentPath: '/content/articles/sprout8.md'
    },
    {
        id: "9",
        title: "DI/IoC 컨테이너 아키텍처 재설계 (2)",
        subtitle: "순환 의존성 처리, 라이프사이클, 프록시 자동생성기 구현기",
        date: "2025-10-23T14:28:00",
        tags: ['spring', 'sprout', 'DI', 'IoC'],
        slug: 'sprout9',
        contentPath: '/content/articles/sprout9.md'
    },
    {
        id: "10",
        title: "커스텀 Non-Blocking I/O 서버 아키텍처 전체 해부",
        subtitle: "Selector와 이벤트 루프로 HTTP를 처리하는 방식",
        date: "2025-10-24T14:28:00",
        tags: ['spring', 'sprout', 'nio', 'bio', 'netty', 'tomcat'],
        slug: 'sprout10',
        contentPath: '/content/articles/sprout10.md'
    },
    {
        id: "11",
        title: "async-profiler로 서버의 병목을 추적하다",
        subtitle: "스택 샘플링 기반 CPU/할당 분석으로 성능 올리기",
        date: "2025-10-27T14:28:00",
        tags: ['spring', 'sprout', 'async-profiler', 'server', 'JVM'],
        slug: 'sprout11',
        contentPath: '/content/articles/sprout11.md'
    },
    {
        id: "12",
        title: "JMC + JITWatch로 본 JIT 컴파일의 세계",
        subtitle: "내가 만든 HTTP 서버가 JVM에서 어떻게 최적화되는가",
        date: "2025-10-28T14:28:00",
        tags: ['spring', 'sprout', 'JMC', 'JITWatch', 'server', 'JVM', 'JIT'],
        slug: 'sprout12',
        contentPath: '/content/articles/sprout12.md'
    },
    {
        id: "13",
        title: "성능 개선 리팩토링 — JIT 친화적 서버로 만들기",
        subtitle: "인라이닝/힙 할당 감소 중심의 개선기",
        date: "2025-10-29T14:28:00",
        tags: ['spring', 'sprout', 'JMC', 'JITWatch', 'server', 'JVM', 'JIT'],
        slug: 'sprout13',
        contentPath: '/content/articles/sprout13.md'
    },
    {
        id: "14",
        title: "WebSocket을 직접 구현하면서 배운 것들: NIO부터 프레임 파싱까지",
        subtitle: "라이브러리 없이 WebSocket을 구현하며 만난 문제들과 해결 과정 기록",
        date: "2025-11-28T00:13:00",
        tags: ['spring', 'sprout', 'WebSocket', 'NIO', 'RFC 6455'],
        slug: 'sprout-websocket',
        contentPath: '/content/articles/sprout-websocket.md'
    },
    {
        id: "15",
        title: "Java Annotation Processing Tool 실전 구현기",
        subtitle: "Jinx 라이브러리 개발 과정에서 겪은 문제와 해결 전략",
        date: "2026-02-13T15:09:30",
        tags: ['jinx', 'apt'],
        slug: 'precautions-for-handling-java-apt',
        contentPath: '/content/articles/precautions-for-handling-java-apt.md'
    },
    {
        id: "16",
        title: "p99 60초에서 106ms로(Bookvoyage)",
        subtitle: "HikariCP 병목 제거와 리소스 격리를 통한 장애 해소 사례",
        date: "2026-02-13T18:29:01",
        tags: ['bookvoyage', 'gatling', 'latency'],
        slug: 'bookvoyage-performance-improvement-report',
        contentPath: '/content/articles/bookvoyage-performance-improvement-report.md'
    }    
];
