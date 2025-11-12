import { notFound } from 'next/navigation';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { PostCard } from '@/components/post-card';
import { getAllTags, getPostsByTag } from '@/lib/tags';
import Link from 'next/link';

type Props = {
  params: Promise<{ tag: string }>;
};

export async function generateStaticParams() {
  const tags = getAllTags();
  return tags.map((tag) => ({
    tag: tag.name,
  }));
}

export default async function TagPage({ params }: Props) {
  const { tag } = await params;
  const decodedTag = decodeURIComponent(tag);

  const posts = getPostsByTag(decodedTag);

  if (posts.length === 0) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 transition-colors">
      <Header />

      <main className="max-w-4xl mx-auto px-6 py-16">
        <div className="space-y-8">
          {/* Header */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
              </Link>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">
                #{decodedTag}
              </h1>
            </div>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              {posts.length}개의 포스트
            </p>
          </div>

          {/* Posts */}
          <div className="space-y-4">
            {posts.map((post) => (
              <div key={post.id} className="relative">
                <PostCard
                  title={post.title}
                  subtitle={post.subtitle}
                  date={post.date}
                  tags={post.tags}
                  href={post.href}
                />
                {/* Post Type Badge */}
                <span className="absolute top-4 right-4 px-2 py-1 text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
                  {post.type === 'til' ? 'TIL' : post.type === 'article' ? 'Article' : 'Reflection'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
