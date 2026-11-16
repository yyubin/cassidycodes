'use client';

import { useState, useCallback } from 'react';
import { PostCard, PostList } from './post-card';
import { LoadingSpinner } from './loading-spinner';
import { useInfiniteScroll } from '@/hooks/use-infinite-scroll';
import type { PostSummary } from '@/lib/posts';

const POSTS_PER_LOAD = 10;

type InfinitePostListProps = {
  posts: PostSummary[];
  emptyMessage?: string;
};

export function InfinitePostList({ posts, emptyMessage = 'No posts yet.' }: InfinitePostListProps) {
  const [displayCount, setDisplayCount] = useState(POSTS_PER_LOAD);
  const [isLoading, setIsLoading] = useState(false);

  const currentPosts = posts.slice(0, displayCount);
  const hasMore = displayCount < posts.length;

  const loadMore = useCallback(() => {
    setIsLoading(true);
    setTimeout(() => {
      setDisplayCount((prev) => Math.min(prev + POSTS_PER_LOAD, posts.length));
      setIsLoading(false);
    }, 300);
  }, [posts.length]);

  const observerTarget = useInfiniteScroll({
    onLoadMore: loadMore,
    hasMore,
    isLoading,
  });

  if (posts.length === 0) {
    return (
      <p className="py-16 text-center font-mono text-sm text-muted">{emptyMessage}</p>
    );
  }

  return (
    <>
      <PostList>
        {currentPosts.map((post) => (
          <PostCard
            key={post.id}
            title={post.title}
            subtitle={post.subtitle}
            date={post.date}
            tags={post.tags}
            href={post.href}
          />
        ))}
      </PostList>

      {isLoading && <LoadingSpinner />}

      {hasMore && !isLoading && <div ref={observerTarget} className="h-16" />}

      {!hasMore && (
        <p className="pt-8 text-center font-mono text-xs text-muted">
          — end of list ({posts.length}) —
        </p>
      )}
    </>
  );
}
