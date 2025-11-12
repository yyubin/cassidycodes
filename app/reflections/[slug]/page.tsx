import { notFound } from 'next/navigation';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { MarkdownContent } from '@/components/markdown-content';
import { PostNavigation } from '@/components/post-navigation';
import { reflectionPosts } from '@/data/reflection-posts';

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return reflectionPosts.map((post) => ({
    slug: post.slug,
  }));
}

export default async function ReflectionPostPage({ params }: Props) {
  const { slug } = await params;

  // Sort posts by date (newest first)
  const sortedPosts = [...reflectionPosts].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const currentIndex = sortedPosts.findIndex((p) => p.slug === slug);
  const post = sortedPosts[currentIndex];

  if (!post) {
    notFound();
  }

  // Get prev and next posts
  const prevPost = currentIndex > 0 ? sortedPosts[currentIndex - 1] : undefined;
  const nextPost = currentIndex < sortedPosts.length - 1 ? sortedPosts[currentIndex + 1] : undefined;

  // Read markdown file
  const filePath = join(process.cwd(), post.contentPath);
  const content = readFileSync(filePath, 'utf-8');

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 transition-colors">
      <Header />

      <main className="max-w-3xl mx-auto px-6 py-16">
        <article className="space-y-8">
          {/* Header */}
          <header className="space-y-4 border-b border-gray-200 dark:border-gray-800 pb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-gray-100 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors">
              {post.title}
            </h1>

            <p className="text-xl text-gray-600 dark:text-gray-400">
              {post.subtitle}
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              {/* Date */}
              <time className="text-sm text-gray-500 dark:text-gray-500">
                {new Date(post.date).toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </time>

              {/* Tags */}
              {post.tags.length > 0 && (
                <>
                  <span className="text-gray-300 dark:text-gray-700">•</span>
                  <div className="flex flex-wrap gap-2">
                    {post.tags.map((tag) => (
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
          </header>

          {/* Markdown Content */}
          <div className="max-w-none">
            <MarkdownContent content={content} />
          </div>

          {/* Post Navigation */}
          <PostNavigation
            prevPost={prevPost}
            nextPost={nextPost}
            basePath="/reflections"
          />
        </article>
      </main>

      <Footer />
    </div>
  );
}
