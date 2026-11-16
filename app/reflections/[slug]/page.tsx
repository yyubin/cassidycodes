import type { Metadata } from 'next';
import { PostArticle, buildPostMetadata } from '@/components/post-article';
import { reflectionPosts } from '@/data/reflection-posts';

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return reflectionPosts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return buildPostMetadata(reflectionPosts, slug, 'reflection');
}

export default async function ReflectionPostPage({ params }: Props) {
  const { slug } = await params;
  return <PostArticle posts={reflectionPosts} slug={slug} type="reflection" />;
}
