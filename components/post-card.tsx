import Link from 'next/link';

type PostCardProps = {
  title: string;
  subtitle: string;
  date: string;
  tags: string[];
  href: string;
};

export function PostCard({ title, subtitle, date, tags, href }: PostCardProps) {
  return (
    <Link href={href} className="block group">
      <article className="p-6 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-zinc-950 hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-md transition-all">
        <div className="space-y-3">
          {/* Title */}
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
            {title}
          </h3>

          {/* Subtitle */}
          <p className="text-gray-600 dark:text-gray-400 line-clamp-2">
            {subtitle}
          </p>

          {/* Date and Tags */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            {/* Date */}
            <time className="text-sm text-gray-500 dark:text-gray-500">
              {new Date(date).toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </time>

            {/* Tags */}
            {tags.length > 0 && (
              <>
                <span className="text-gray-300 dark:text-gray-700">•</span>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-md"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </article>
    </Link>
  );
}
