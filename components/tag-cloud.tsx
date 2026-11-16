import Link from 'next/link';
import { TagWithCount } from '@/lib/tags';

interface TagCloudProps {
  tags: TagWithCount[];
  maxTags?: number;
}

export function TagCloud({ tags, maxTags = 20 }: TagCloudProps) {
  const displayTags = tags.slice(0, maxTags);

  return (
    <div>
      <ul className="flex flex-wrap gap-2">
        {displayTags.map((tag) => (
          <li key={tag.name}>
            <Link
              href={`/tags/${encodeURIComponent(tag.name)}`}
              className="inline-flex items-center gap-1.5 font-mono text-xs border border-line rounded px-2 py-1 text-fg hover:border-accent hover:text-accent transition-colors"
            >
              {tag.name}
              <span className="text-muted tabular-nums">{tag.count}</span>
            </Link>
          </li>
        ))}
      </ul>

      {tags.length > maxTags && (
        <p className="mt-3 font-mono text-xs text-muted">
          +{tags.length - maxTags} more tags
        </p>
      )}
    </div>
  );
}
