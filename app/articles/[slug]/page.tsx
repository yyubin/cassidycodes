import type { Metadata } from 'next';
import { PostArticle, buildPostMetadata } from '@/components/post-article';
import { articlePosts } from '@/data/article-posts';

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return articlePosts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return buildPostMetadata(articlePosts, slug, 'article');
}

export default async function ArticlePostPage({ params }: Props) {
  const { slug } = await params;
  return <PostArticle posts={articlePosts} slug={slug} type="article" />;
}
