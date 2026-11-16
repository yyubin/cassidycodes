import type { Metadata } from 'next';
import { PageShell, PageHeader } from '@/components/page-shell';
import { PostCard, PostList } from '@/components/post-card';
import { reflectionPosts } from '@/data/reflection-posts';
import { sortByDateDesc, toSummary, PostSummary } from '@/lib/posts';

export const metadata: Metadata = {
  title: 'Reflections',
};

export default function ReflectionsPage() {
  const posts = sortByDateDesc(reflectionPosts.map((p) => toSummary(p, 'reflection')));

  // 연도별 그룹 (posts가 이미 최신순이라 그룹 순서도 최신순)
  const yearSections = posts.reduce<{ year: string; posts: PostSummary[] }[]>((acc, post) => {
    const year = post.date.slice(0, 4);
    const last = acc[acc.length - 1];
    if (last && last.year === year) {
      last.posts.push(post);
    } else {
      acc.push({ year, posts: [post] });
    }
    return acc;
  }, []);

  return (
    <PageShell>
      <PageHeader
        label="reflections"
        title="Reflections"
        description="프로젝트 회고"
        meta={`${posts.length} posts`}
      />

      {yearSections.map((section) => (
        <section key={section.year} className="pt-10">
          <h2 className="font-mono text-sm text-muted pb-2 border-b border-line">
            {section.year}
            <span className="ml-2 text-muted/70">({section.posts.length})</span>
          </h2>
          <PostList>
            {section.posts.map((post) => (
              <PostCard
                key={post.id}
                title={post.title}
                subtitle={post.subtitle}
                date={post.date}
                tags={post.tags}
                href={post.href}
              />
            ))}
          </PostList>
        </section>
      ))}
    </PageShell>
  );
}
