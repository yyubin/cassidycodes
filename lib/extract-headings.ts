import GithubSlugger from 'github-slugger';

export interface HeadingItem {
  id: string;
  text: string;
  level: number;
}

export function extractHeadings(markdown: string): HeadingItem[] {
  const headingRegex = /^(#{1,6})\s+(.+)$/gm;
  const headings: HeadingItem[] = [];
  const slugger = new GithubSlugger();
  let match;

  while ((match = headingRegex.exec(markdown)) !== null) {
    const level = match[1].length;
    const text = match[2].trim();

    // Generate ID using github-slugger (same as rehype-slug)
    const id = slugger.slug(text);

    headings.push({ id, text, level });
  }

  return headings;
}
