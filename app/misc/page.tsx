'use client';

import { useState, useMemo, useCallback } from 'react';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { MiscBubble } from '@/components/misc-bubble';
import { DateDivider } from '@/components/date-divider';
import { LoadingSpinner } from '@/components/loading-spinner';
import { useInfiniteScroll } from '@/hooks/use-infinite-scroll';
import { MiscPost } from '@/types';
import { miscPosts as allMiscPosts } from '@/data/misc-posts';

// Sort posts by date descending for reverse chronological order (latest first)
const miscPosts = allMiscPosts.slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

const POSTS_PER_LOAD = 10;

export default function MiscPage() {
  const [displayCount, setDisplayCount] = useState(POSTS_PER_LOAD);
  const [isLoading, setIsLoading] = useState(false);

  // Get currently displayed posts
  const currentPosts = miscPosts.slice(0, displayCount);
  const hasMore = displayCount < miscPosts.length;

  // Load more posts
  const loadMore = useCallback(() => {
    setIsLoading(true);

    // Simulate loading delay for better UX
    setTimeout(() => {
      setDisplayCount(prev => Math.min(prev + POSTS_PER_LOAD, miscPosts.length));
      setIsLoading(false);
    }, 500);
  }, []);

  // Infinite scroll hook
  const observerTarget = useInfiniteScroll({
    onLoadMore: loadMore,
    hasMore,
    isLoading,
  });

  // Group posts by date
  const groupedPosts = useMemo(() => {
    const grouped: { date: string; posts: MiscPost[] }[] = [];

    currentPosts.forEach((post) => {
      const dateOnly = post.date.split('T')[0];
      const existingGroup = grouped.find(group => group.date === dateOnly);

      if (existingGroup) {
        existingGroup.posts.push(post);
      } else {
        grouped.push({ date: dateOnly, posts: [post] });
      }
    });

    return grouped;
  }, [currentPosts]);

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 transition-colors">
      <Header />

      <main className="max-w-4xl mx-auto px-6 py-16">
        <div className="space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">
              Misc
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Random thoughts and casual conversations
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Showing {currentPosts.length} of {miscPosts.length} posts
            </p>
          </div>

          {miscPosts.length > 0 ? (
            <>
              <div className="mt-8">
                {groupedPosts.map((group, groupIndex) => (
                  <div key={group.date}>
                    {groupIndex === 0 && <DateDivider date={group.date} />}

                    <div className="space-y-2">
                      {group.posts.map((post) => (
                        <MiscBubble
                          key={post.id}
                          post={post}
                        />
                      ))}
                    </div>

                    {groupIndex < groupedPosts.length - 1 && (
                      <DateDivider date={groupedPosts[groupIndex + 1].date} />
                    )}
                  </div>
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
                아직 잡담이 없습니다. 첫 생각을 공유해보세요!
              </p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
