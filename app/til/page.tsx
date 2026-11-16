import type { Metadata } from 'next';
import { PageShell, PageHeader } from '@/components/page-shell';
import { InfinitePostList } from '@/components/infinite-post-list';
import { tilPosts } from '@/data/til-posts';
import { sortByDateDesc, toSummary } from '@/lib/posts';

export const metadata: Metadata = {
  title: 'TIL',
};

const posts = sortByDateDesc(tilPosts.map((p) => toSummary(p, 'til')));

export default function TILPage() {
  return (
    <PageShell>
      <PageHeader
        label="til"
        title="TIL"
        description="Today I Learned 학습 노트"
        meta={`${posts.length} posts`}
      />
      <InfinitePostList posts={posts} emptyMessage="No TIL posts yet." />
    </PageShell>
  );
}
