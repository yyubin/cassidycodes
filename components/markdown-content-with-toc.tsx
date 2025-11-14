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
    <div className="relative flex gap-8">
      {/* Main Content */}
      <div className="flex-1 min-w-0">
        <MarkdownContent content={content} />
      </div>

      {/* Table of Contents - Right Side */}
      <aside className="hidden xl:block w-64 flex-shrink-0">
        <TableOfContents headings={headings} />
      </aside>
    </div>
  );
}
