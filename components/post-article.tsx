import { readFileSync } from 'fs';
import { join } from 'path';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { PageShell } from './page-shell';
import { MarkdownContentWithTOC } from './markdown-content-with-toc';
import { PostNavigation } from './post-navigation';
import { GiscusComments } from './giscus-comments';
import { formatDate, sortByDateDesc, POST_TYPE_META, PostType } from '@/lib/posts';

type SourcePost = {
  id: string;
  title: string;
  subtitle: string;
  date: string;
  tags: string[];
  slug: string;
  contentPath: string;
};

export function buildPostMetadata(posts: SourcePost[], slug: string, type: PostType): Metadata {
  const post = posts.find((p) => p.slug === slug);
  if (!post) {
    return { title: 'Not Found' };
  }

  return {
    title: post.title,
    description: post.subtitle,
    keywords: post.tags,
    openGraph: {
      title: post.title,
      description: post.subtitle,
      type: 'article',
      publishedTime: post.date,
      tags: post.tags,
      url: `${POST_TYPE_META[type].basePath}/${post.slug}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.subtitle,
    },
  };
}

type PostArticleProps = {
  posts: SourcePost[];
  slug: string;
  type: PostType;
};

export function PostArticle({ posts, slug, type }: PostArticleProps) {
  const { basePath } = POST_TYPE_META[type];
  const sortedPosts = sortByDateDesc(posts);
  const currentIndex = sortedPosts.findIndex((p) => p.slug === slug);
  const post = sortedPosts[currentIndex];

  if (!post) {
    notFound();
  }

  // 최신순 정렬 기준: 이전글 = 더 오래된 글, 다음글 = 더 최신 글
  const olderPost = sortedPosts[currentIndex + 1];
  const newerPost = currentIndex > 0 ? sortedPosts[currentIndex - 1] : undefined;

  const content = readFileSync(join(process.cwd(), post.contentPath), 'utf-8');

  return (
    <PageShell width="wide">
      <article>
        <header className="space-y-4 pb-8 mb-10 border-b border-line">
          <p className="font-mono text-xs text-muted">
            <Link href={basePath} className="hover:text-accent transition-colors">
              {basePath.slice(1)}
            </Link>
            <span className="mx-2 text-line">/</span>
            <time dateTime={post.date}>{formatDate(post.date)}</time>
          </p>

          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight leading-tight">
            {post.title}
          </h1>

          {post.subtitle && <p className="text-lg text-muted">{post.subtitle}</p>}

          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {post.tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/tags/${encodeURIComponent(tag)}`}
                  className="font-mono text-xs text-muted border border-line rounded px-2 py-0.5 hover:text-fg hover:border-muted transition-colors"
                >
                  #{tag}
                </Link>
              ))}
            </div>
          )}
        </header>

        <MarkdownContentWithTOC content={content} />

        <div className="max-w-3xl">
          <PostNavigation prevPost={olderPost} nextPost={newerPost} basePath={basePath} />
          <GiscusComments />
        </div>
      </article>
    </PageShell>
  );
}
