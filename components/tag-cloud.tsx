import Link from 'next/link';
import { TagWithCount } from '@/lib/tags';

interface TagCloudProps {
  tags: TagWithCount[];
  maxTags?: number;
}

export function TagCloud({ tags, maxTags = 20 }: TagCloudProps) {
  const displayTags = tags.slice(0, maxTags);

  // 최대/최소 개수로 크기 계산
  const maxCount = Math.max(...displayTags.map(t => t.count));
  const minCount = Math.min(...displayTags.map(t => t.count));

  const getTagSize = (count: number) => {
    if (maxCount === minCount) return 'text-base';

    const ratio = (count - minCount) / (maxCount - minCount);

    if (ratio > 0.7) return 'text-2xl';
    if (ratio > 0.5) return 'text-xl';
    if (ratio > 0.3) return 'text-lg';
    return 'text-base';
  };

  const getTagColor = (count: number) => {
    if (maxCount === minCount) return 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300';

    const ratio = (count - minCount) / (maxCount - minCount);

    if (ratio > 0.7) return 'bg-cyan-500 dark:bg-cyan-600 text-white';
    if (ratio > 0.5) return 'bg-cyan-400 dark:bg-cyan-700 text-white';
    if (ratio > 0.3) return 'bg-cyan-200 dark:bg-cyan-800/50 text-cyan-800 dark:text-cyan-200';
    return 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300';
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6 text-center">
        Tags
      </h2>

      <div className="flex flex-wrap gap-3 justify-center items-center">
        {displayTags.map(tag => (
          <Link
            key={tag.name}
            href={`/tags/${encodeURIComponent(tag.name)}`}
            className={`
              inline-flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all
              hover:scale-110 hover:shadow-lg hover:bg-zinc-800/10
              ${getTagSize(tag.count)}
              ${getTagColor(tag.count)}
            `}
          >
            <span>{tag.name}</span>
            <span className="text-xs opacity-75">({tag.count})</span>
          </Link>
        ))}
      </div>

      {tags.length > maxTags && (
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-500">
            총 {tags.length}개의 태그
          </p>
        </div>
      )}
    </div>
  );
}
