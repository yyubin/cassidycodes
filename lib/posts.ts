import { articlePosts } from "@/data/article-posts";
import { tilPosts } from "@/data/til-posts";
import { reflectionPosts } from "@/data/reflection-posts";

export type PostType = "article" | "til" | "reflection";

export type PostSummary = {
  id: string;
  title: string;
  subtitle: string;
  date: string;
  tags: string[];
  slug: string;
  type: PostType;
  href: string;
};

export const POST_TYPE_META: Record<PostType, { label: string; basePath: string }> = {
  article: { label: "Article", basePath: "/articles" },
  til: { label: "TIL", basePath: "/til" },
  reflection: { label: "Reflection", basePath: "/reflections" },
};

type RawPost = {
  id: string;
  title: string;
  subtitle: string;
  date: string;
  tags: string[];
  slug: string;
};

export function toSummary(post: RawPost, type: PostType): PostSummary {
  return {
    id: `${type}-${post.id}`,
    title: post.title,
    subtitle: post.subtitle,
    date: post.date,
    tags: post.tags,
    slug: post.slug,
    type,
    href: `${POST_TYPE_META[type].basePath}/${post.slug}`,
  };
}

export function sortByDateDesc<T extends { date: string }>(posts: T[]): T[] {
  return posts
    .slice()
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getAllPosts(): PostSummary[] {
  return sortByDateDesc([
    ...articlePosts.map((p) => toSummary(p, "article")),
    ...tilPosts.map((p) => toSummary(p, "til")),
    ...reflectionPosts.map((p) => toSummary(p, "reflection")),
  ]);
}

/** "2025-06-06T14:28:00" → "2025-06-06" (타임존 영향 없이) */
export function formatDate(date: string): string {
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(date);
  if (match) return match[1];
  const d = new Date(date);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
