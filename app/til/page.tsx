'use client';

import { useState, useCallback } from 'react';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { PostCard } from '@/components/post-card';
import { LoadingSpinner } from '@/components/loading-spinner';
import { useInfiniteScroll } from '@/hooks/use-infinite-scroll';
import { tilPosts } from '@/data/til-posts';

// Sort posts by date descending (latest first)
const sortedTilPosts = tilPosts.slice().sort((a, b) =>
  new Date(b.date).getTime() - new Date(a.date).getTime()
);

const POSTS_PER_LOAD = 10;

export default function TILPage() {
  const [displayCount, setDisplayCount] = useState(POSTS_PER_LOAD);
  const [isLoading, setIsLoading] = useState(false);

  // Get currently displayed posts
  const currentPosts = sortedTilPosts.slice(0, displayCount);
  const hasMore = displayCount < sortedTilPosts.length;

  // Load more posts
  const loadMore = useCallback(() => {
    setIsLoading(true);

    // Simulate loading delay for better UX
    setTimeout(() => {
      setDisplayCount(prev => Math.min(prev + POSTS_PER_LOAD, sortedTilPosts.length));
      setIsLoading(false);
    }, 500);
  }, []);

  // Infinite scroll hook
  const observerTarget = useInfiniteScroll({
    onLoadMore: loadMore,
    hasMore,
    isLoading,
  });

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 transition-colors">
      <Header />

      <main className="max-w-4xl mx-auto px-6 py-16">
        <div className="space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">
              TIL
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
            
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Showing {currentPosts.length} of {sortedTilPosts.length} posts
            </p>
          </div>

          {sortedTilPosts.length > 0 ? (
            <>
              <div className="space-y-4">
                {currentPosts.map((post) => (
                  <PostCard
                    key={post.id}
                    title={post.title}
                    subtitle={post.subtitle}
                    date={post.date}
                    tags={post.tags}
                    href={`/til/${post.slug}`}
                  />
                ))}
              </div>

              {/* Loading indicator */}
              {isLoading && <LoadingSpinner />}

              {/* Intersection observer target */}
              {hasMore && !isLoading && (
                <div ref={observerTarget} className="h-20 flex items-center justify-center">
                  <p className="text-sm text-gray-500 dark:text-gray-500">
                    Scroll for more...
                  </p>
                </div>
              )}

              {/* End of posts message */}
              {!hasMore && currentPosts.length > 0 && (
                <div className="py-8 text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-500">
                    모든 포스트를 불러왔습니다
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="p-6 rounded-lg border border-gray-200 dark:border-gray-800 border-dashed">
              <p className="text-gray-500 dark:text-gray-500 text-center">
                No posts yet.
              </p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
