'use client';

import { useSearchParams } from 'next/navigation';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { SearchInput } from '@/components/search-input';
import { PostCard } from '@/components/post-card';
import { searchPosts } from '@/lib/tags';
import { Suspense } from 'react';

function SearchResults() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const results = searchPosts(query);

  return (
    <div className="space-y-8">
      {/* Search Input */}
      <SearchInput />

      {/* Results */}
      <div className="space-y-6">
        {query && (
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              검색 결과
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              "{query}" 검색 결과 {results.length}개
            </p>
          </div>
        )}

        {!query ? (
          <div className="py-16 text-center">
            <p className="text-gray-500 dark:text-gray-500">
              검색어를 입력해주세요
            </p>
          </div>
        ) : results.length === 0 ? (
          <div className="py-16 text-center space-y-4">
            <p className="text-xl text-gray-500 dark:text-gray-500">
              검색 결과가 없습니다
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-600">
              다른 검색어로 시도해보세요
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {results.map((post) => (
              <div key={post.id} className="relative">
                <PostCard
                  title={post.title}
                  subtitle={post.subtitle}
                  date={post.date}
                  tags={post.tags}
                  href={post.href}
                />
                {/* Post Type Badge */}
                <span className="absolute top-4 right-4 px-2 py-1 text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
                  {post.type === 'til' ? 'TIL' : post.type === 'article' ? 'Article' : 'Reflection'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 transition-colors">
      <Header />

      <main className="max-w-4xl mx-auto px-6 py-16">
        <Suspense fallback={
          <div className="text-center py-16">
            <p className="text-gray-500 dark:text-gray-500">검색 중...</p>
          </div>
        }>
          <SearchResults />
        </Suspense>
      </main>

      <Footer />
    </div>
  );
}
