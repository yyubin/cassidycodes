'use client';

import { MarkdownContent } from './markdown-content';
import { TableOfContents } from './table-of-contents';
import { extractHeadings } from '@/lib/extract-headings';

interface MarkdownContentWithTOCProps {
  content: string;
}

export function MarkdownContentWithTOC({ content }: MarkdownContentWithTOCProps) {
  const headings = extractHeadings(content);

  return (
    <div className="relative flex gap-12">
      <div className="flex-1 min-w-0 max-w-3xl">
        <MarkdownContent content={content} />
      </div>

      <aside className="hidden lg:block w-56 flex-shrink-0">
        <TableOfContents headings={headings} />
      </aside>
    </div>
  );
}
