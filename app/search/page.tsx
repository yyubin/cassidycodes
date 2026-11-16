'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { PageShell, PageHeader } from '@/components/page-shell';
import { SearchInput } from '@/components/search-input';
import { PostCard, PostList } from '@/components/post-card';
import { searchPosts } from '@/lib/tags';
import { POST_TYPE_META } from '@/lib/posts';

function SearchResults() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const results = searchPosts(query);

  return (
    <div className="space-y-8 pt-8">
      <SearchInput key={query} defaultValue={query} autoFocus={!query} />

      {query && (
        <p className="font-mono text-xs text-muted">
          {results.length} result{results.length === 1 ? '' : 's'} for{' '}
          <span className="text-fg">&quot;{query}&quot;</span>
        </p>
      )}

      {!query ? (
        <p className="py-12 text-center font-mono text-sm text-muted">검색어를 입력해주세요</p>
      ) : results.length === 0 ? (
        <p className="py-12 text-center font-mono text-sm text-muted">
          검색 결과가 없습니다. 다른 검색어로 시도해보세요.
        </p>
      ) : (
        <PostList>
          {results.map((post) => (
            <PostCard
              key={post.id}
              title={post.title}
              subtitle={post.subtitle}
              date={post.date}
              tags={post.tags}
              href={post.href}
              label={POST_TYPE_META[post.type].label}
            />
          ))}
        </PostList>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <PageShell>
      <PageHeader label="search" title="Search" />
      <Suspense
        fallback={<p className="py-12 text-center font-mono text-sm text-muted">loading…</p>}
      >
        <SearchResults />
      </Suspense>
    </PageShell>
  );
}
