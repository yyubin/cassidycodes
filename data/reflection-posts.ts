import { Reflection } from '@/types';

export const reflectionPosts: Reflection[] = [
    {
        id: "1",
        title: "Jinx 개발 회고",
        subtitle: "JPA 애노테이션으로 DB 마이그레이션을 자동화하다",
        date: "2025-09-25T14:28:00",
        tags: ['jinx', 'database', 'migration'],
        slug: 'jinx',
        contentPath: '/content/reflections/jinx.md'
    },
    {
        id: "2",
        title: "Jinx - ColumnDiffer 리팩토링 회고",
        subtitle: "정확성과 안전성을 최우선으로...",
        date: "2025-12-15T22:44:00",
        tags: ['jinx', 'schema matching', 'rename'],
        slug: "jinx-dispose-rename",
        contentPath: '/content/reflections/jinx-dispose-rename.md'
    },
    {
        id: "3",
        title: "스프링 두 번 만들기를 두 번 하는 청년",
        subtitle: "인사 담당자 열람 금지",
        date: "2026-05-30T01:01:00",
        tags: ['spring', 'reflection', 'java'],
        slug: "fitory-servlet-backend",
        contentPath: '/content/reflections/fitory-servlet-backend.md'
    }
];
