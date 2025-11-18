import { TILPost } from '@/types';

export const tilPosts: TILPost[] = [
    {
        id: "1",
        title: "헷갈리던 Rust 메모리 구조, 예제 중심으로 다시 보기",
        subtitle: "문법보단 동작 원리를 파악하려고 노력해봤습니다",
        date: "2025-11-14T16:28:00",
        tags: ['Rust', 'Ownership', 'SmartPointers', 'Lifetime', 'RcArc'],
        slug: "memory-management-wonership-in-rust",
        contentPath: '/content/til/memory-management-wonership-in-rust.md'
    },
    {
        id: "2",
        title: "Go의 netpollor 소스코드 뜯어보기",
        subtitle: "Go가 tail latency에서 압도적으로 좋은 이유",
        date: "2025-11-18T23:48:00",
        tags: ['Go', 'Goroutine', 'netpollor'],
        slug: "go-netpollor",
        contentPath: '/content/til/go-netpoller.md'
    }
];
