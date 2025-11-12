import { useEffect, useRef } from 'react';

type UseInfiniteScrollOptions = {
  onLoadMore: () => void;
  hasMore: boolean;
  isLoading: boolean;
};

export function useInfiniteScroll({ onLoadMore, hasMore, isLoading }: UseInfiniteScrollOptions) {
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = observerTarget.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          onLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(target);

    return () => {
      if (target) {
        observer.unobserve(target);
      }
    };
  }, [onLoadMore, hasMore, isLoading]);

  return observerTarget;
}
