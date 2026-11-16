import Link from 'next/link';

interface Post {
  title: string;
  slug: string;
}

interface PostNavigationProps {
  prevPost?: Post;
  nextPost?: Post;
  basePath: string;
}

export function PostNavigation({ prevPost, nextPost, basePath }: PostNavigationProps) {
  return (
    <nav className="mt-16 pt-8 border-t border-line space-y-6" aria-label="Post navigation">
      {(prevPost || nextPost) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {prevPost ? (
            <Link
              href={`${basePath}/${prevPost.slug}`}
              className="group block p-4 rounded-md border border-line hover:border-muted transition-colors"
            >
              <span className="block font-mono text-xs text-muted mb-1">← prev</span>
              <span className="block text-sm font-medium group-hover:text-accent transition-colors line-clamp-2">
                {prevPost.title}
              </span>
            </Link>
          ) : (
            <div className="hidden sm:block" />
          )}

          {nextPost && (
            <Link
              href={`${basePath}/${nextPost.slug}`}
              className="group block p-4 rounded-md border border-line hover:border-muted transition-colors sm:text-right"
            >
              <span className="block font-mono text-xs text-muted mb-1">next →</span>
              <span className="block text-sm font-medium group-hover:text-accent transition-colors line-clamp-2">
                {nextPost.title}
              </span>
            </Link>
          )}
        </div>
      )}

      <Link
        href={basePath}
        className="inline-block font-mono text-xs text-muted hover:text-accent transition-colors"
      >
        ← all {basePath.slice(1)}
      </Link>
    </nav>
  );
}
