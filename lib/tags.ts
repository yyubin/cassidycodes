import { getAllPosts } from "@/lib/posts";

export interface TagWithCount {
  name: string;
  count: number;
}

export function getAllTags(): TagWithCount[] {
  const tagMap = new Map<string, number>();

  getAllPosts().forEach((post) => {
    post.tags.forEach((tag) => {
      tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
    });
  });

  return Array.from(tagMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count); // 개수 많은 순서
}

export function getPostsByTag(tag: string) {
  return getAllPosts().filter((post) => post.tags.includes(tag));
}

export function searchPosts(query: string) {
  if (!query.trim()) {
    return [];
  }

  const lowerQuery = query.toLowerCase();

  return getAllPosts().filter((post) => {
    const matchTitle = post.title.toLowerCase().includes(lowerQuery);
    const matchSubtitle = post.subtitle.toLowerCase().includes(lowerQuery);
    const matchTags = post.tags.some((tag) =>
      tag.toLowerCase().includes(lowerQuery),
    );

    return matchTitle || matchSubtitle || matchTags;
  });
}
