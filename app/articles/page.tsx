import type { Metadata } from 'next';
import { PageShell, PageHeader } from '@/components/page-shell';
import { InfinitePostList } from '@/components/infinite-post-list';
import { articlePosts } from '@/data/article-posts';
import { sortByDateDesc, toSummary } from '@/lib/posts';

export const metadata: Metadata = {
  title: 'Articles',
};

const posts = sortByDateDesc(articlePosts.map((p) => toSummary(p, 'article')));

export default function ArticlesPage() {
  return (
    <PageShell>
      <PageHeader
        label="articles"
        title="Articles"
        description="심층 기술 글"
        meta={`${posts.length} posts`}
      />
      <InfinitePostList posts={posts} emptyMessage="No articles yet." />
    </PageShell>
  );
}
