import { TILPost } from '@/types';

export const tilPosts: TILPost[] = [
    {
        id: "0",
        title: "CodeRabbit AI로 코드리뷰 받기",
        subtitle: "JPA 상속 처리 리팩토링 및 리뷰 회고록",
        date: "2025-08-25T16:28:00",
        tags: ['jinx', 'CodeRabbit', '코드리뷰', '리팩토링'],
        slug: "jinx-coderabbit-ai-reveiw",
        contentPath: '/content/til/jinx-coderabbit-ai-review.md'
    }, 
    {
        id: "1",
        title: "직접 만든 오픈소스로 DDL 자동 생성하기",
        subtitle: "Jinx 직접 사용해본 후기",
        date: "2025-10-24T16:28:00",
        tags: ['jinx', 'ddl', '마이그레이션', '오픈소스'],
        slug: "jinx-user-review",
        contentPath: '/content/til/jinx-user-review.md'
    },           
    {
        id: "2",
        title: "헷갈리던 Rust 메모리 구조, 예제 중심으로 다시 보기",
        subtitle: "문법보단 동작 원리를 파악하려고 노력해봤습니다",
        date: "2025-11-14T16:28:00",
        tags: ['Rust', 'Ownership', 'SmartPointers', 'Lifetime', 'RcArc'],
        slug: "memory-management-wonership-in-rust",
        contentPath: '/content/til/memory-management-wonership-in-rust.md'
    },
    {
        id: "3",
        title: "Go의 netpollor 소스코드 뜯어보기",
        subtitle: "Go가 tail latency에서 압도적으로 좋은 이유",
        date: "2025-11-18T23:48:00",
        tags: ['Go', 'Goroutine', 'netpollor'],
        slug: "go-netpollor",
        contentPath: '/content/til/go-netpoller.md'
    }
];
