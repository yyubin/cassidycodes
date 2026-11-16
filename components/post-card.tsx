import Link from 'next/link';
import { formatDate } from '@/lib/posts';

type PostCardProps = {
  title: string;
  subtitle: string;
  date: string;
  tags: string[];
  href: string;
  /** 검색/태그 페이지에서 카테고리 표시용 */
  label?: string;
};

/** 목록의 한 줄. 날짜 컬럼 + 제목/부제/태그 구성 */
export function PostCard({ title, subtitle, date, tags, href, label }: PostCardProps) {
  return (
    <li className="border-b border-line last:border-b-0">
      <Link
        href={href}
        className="group grid gap-1 sm:gap-6 sm:grid-cols-[6.5rem_1fr] py-5"
      >
        <time
          dateTime={date}
          className="font-mono text-xs text-muted sm:pt-1 tabular-nums"
        >
          {formatDate(date)}
        </time>

        <div className="min-w-0 space-y-1.5">
          <h3 className="font-medium leading-snug text-fg group-hover:text-accent transition-colors">
            {label && (
              <span className="mr-2 align-middle font-mono text-[11px] font-normal text-muted border border-line rounded px-1.5 py-0.5">
                {label}
              </span>
            )}
            {title}
          </h3>

          {subtitle && (
            <p className="text-sm text-muted line-clamp-2">{subtitle}</p>
          )}

          {tags.length > 0 && (
            <p className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-xs text-muted/80">
              {tags.map((tag) => (
                <span key={tag}>#{tag}</span>
              ))}
            </p>
          )}
        </div>
      </Link>
    </li>
  );
}

export function PostList({ children }: { children: React.ReactNode }) {
  return <ul>{children}</ul>;
}
