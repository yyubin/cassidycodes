'use client';

import { useState, useMemo, useCallback } from 'react';
import { PageShell, PageHeader } from '@/components/page-shell';
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
    <PageShell>
      <PageHeader
        label="misc"
        title="Misc"
        description="Random thoughts and casual conversations"
        meta={`${miscPosts.length} posts`}
      />

      {miscPosts.length > 0 ? (
        <>
          <div className="pt-2">
            {groupedPosts.map((group) => (
              <div key={group.date}>
                <DateDivider date={group.date} />
                <div className="space-y-2">
                  {group.posts.map((post) => (
                    <MiscBubble key={post.id} post={post} />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {isLoading && <LoadingSpinner />}

          {hasMore && !isLoading && <div ref={observerTarget} className="h-16" />}

          {!hasMore && (
            <p className="pt-8 text-center font-mono text-xs text-muted">
              — end of list ({miscPosts.length}) —
            </p>
          )}
        </>
      ) : (
        <p className="py-16 text-center font-mono text-sm text-muted">아직 잡담이 없습니다.</p>
      )}
    </PageShell>
  );
}
