import Link from 'next/link';
import { PageShell } from '@/components/page-shell';
import { SearchInput } from '@/components/search-input';
import { TagCloud } from '@/components/tag-cloud';
import { PostCard, PostList } from '@/components/post-card';
import { getAllTags } from '@/lib/tags';
import { getAllPosts, POST_TYPE_META, PostType } from '@/lib/posts';

const RECENT_COUNT = 8;

function SectionTitle({ children, href }: { children: React.ReactNode; href?: string }) {
  return (
    <div className="flex items-baseline justify-between pb-2 border-b border-line">
      <h2 className="font-mono text-xs text-muted">
        <span className="text-accent">{'//'}</span> {children}
      </h2>
      {href && (
        <Link href={href} className="font-mono text-xs text-muted hover:text-accent transition-colors">
          view all →
        </Link>
      )}
    </div>
  );
}

export default function Home() {
  const tags = getAllTags();
  const allPosts = getAllPosts();
  const recentPosts = allPosts.slice(0, RECENT_COUNT);

  const counts = (Object.keys(POST_TYPE_META) as PostType[]).map((type) => ({
    type,
    ...POST_TYPE_META[type],
    count: allPosts.filter((p) => p.type === type).length,
  }));

  return (
    <PageShell>
      <div className="space-y-14">
        {/* Intro */}
        <section className="space-y-5">
          <h1 className="font-mono text-2xl sm:text-3xl font-semibold tracking-tight">
            <span className="text-accent">~/</span>cassidycodes
          </h1>
          <p className="text-muted leading-relaxed">
            개발 블로그 · 기술 글, 학습 노트, 회고
          </p>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 font-mono text-xs" aria-label="Categories">
            {counts.map((c) => (
              <Link key={c.type} href={c.basePath} className="group inline-flex gap-1.5">
                <span className="text-muted group-hover:text-accent transition-colors">
                  {c.basePath.slice(1)}
                </span>
                <span className="text-fg tabular-nums">{c.count}</span>
              </Link>
            ))}
          </nav>
          <SearchInput />
        </section>

        {/* Recent */}
        <section>
          <SectionTitle>recent</SectionTitle>
          <PostList>
            {recentPosts.map((post) => (
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
        </section>

        {/* Tags */}
        <section className="space-y-4">
          <SectionTitle>tags</SectionTitle>
          <TagCloud tags={tags} maxTags={40} />
        </section>
      </div>
    </PageShell>
  );
}
