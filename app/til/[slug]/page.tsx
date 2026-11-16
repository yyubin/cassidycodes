import type { Metadata } from 'next';
import { PostArticle, buildPostMetadata } from '@/components/post-article';
import { tilPosts } from '@/data/til-posts';

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return tilPosts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return buildPostMetadata(tilPosts, slug, 'til');
}

export default async function TILPostPage({ params }: Props) {
  const { slug } = await params;
  return <PostArticle posts={tilPosts} slug={slug} type="til" />;
}
