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
  if (!prevPost && !nextPost) {
    return null;
  }

  return (
    <nav className="mt-16 pt-8 border-t border-gray-200 dark:border-gray-800">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 이전글 */}
        <div className="flex justify-start">
          {prevPost ? (
            <Link
              href={`${basePath}/${prevPost.slug}`}
              className="group flex flex-col p-4 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-cyan-500 dark:hover:border-cyan-400 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-all w-full"
            >
              <span className="text-sm text-gray-500 dark:text-gray-500 mb-1">
                ← 이전글
              </span>
              <span className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 line-clamp-2">
                {prevPost.title}
              </span>
            </Link>
          ) : (
            <div className="w-full" />
          )}
        </div>

        {/* 다음글 */}
        <div className="flex justify-end">
          {nextPost ? (
            <Link
              href={`${basePath}/${nextPost.slug}`}
              className="group flex flex-col p-4 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-cyan-500 dark:hover:border-cyan-400 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-all w-full text-right"
            >
              <span className="text-sm text-gray-500 dark:text-gray-500 mb-1">
                다음글 →
              </span>
              <span className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 line-clamp-2">
                {nextPost.title}
              </span>
            </Link>
          ) : (
            <div className="w-full" />
          )}
        </div>
      </div>

      {/* 목록으로 돌아가기 */}
      <div className="mt-6 text-center">
        <Link
          href={basePath}
          className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
          목록으로 돌아가기
        </Link>
      </div>
    </nav>
  );
}
