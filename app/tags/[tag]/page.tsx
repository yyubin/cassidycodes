import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { PageShell, PageHeader } from '@/components/page-shell';
import { PostCard, PostList } from '@/components/post-card';
import { getAllTags, getPostsByTag } from '@/lib/tags';
import { POST_TYPE_META } from '@/lib/posts';

type Props = {
  params: Promise<{ tag: string }>;
};

export async function generateStaticParams() {
  return getAllTags().map((tag) => ({ tag: tag.name }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tag } = await params;
  return { title: `#${decodeURIComponent(tag)}` };
}

export default async function TagPage({ params }: Props) {
  const { tag } = await params;
  const decodedTag = decodeURIComponent(tag);
  const posts = getPostsByTag(decodedTag);

  if (posts.length === 0) {
    notFound();
  }

  return (
    <PageShell>
      <PageHeader
        label="tags"
        title={`#${decodedTag}`}
        meta={
          <>
            {posts.length} posts
            <span className="mx-2 text-line">|</span>
            <Link href="/" className="hover:text-accent transition-colors">
              ← home
            </Link>
          </>
        }
      />
      <PostList>
        {posts.map((post) => (
          <PostCard
            key={post.id}
            title={post.title}
            subtitle={post.subtitle}
            date={post.date}
            tags={post.tags}
            href={post.href}
            label={POST_TYPE_META[post.type].label}
          />
        ))}
      </PostList>
    </PageShell>
  );
}
