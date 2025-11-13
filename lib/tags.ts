import { tilPosts } from '@/data/til-posts';
import { articlePosts } from '@/data/article-posts';
import { reflectionPosts } from '@/data/reflection-posts';

export interface TagWithCount {
  name: string;
  count: number;
}

export function getAllTags(): TagWithCount[] {
  const allPosts = [...tilPosts, ...articlePosts, ...reflectionPosts];
  const tagMap = new Map<string, number>();

  allPosts.forEach(post => {
    post.tags.forEach(tag => {
      tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
    });
  });

  return Array.from(tagMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count); // 개수 많은 순서
}

export function getPostsByTag(tag: string) {
  // 각 포스트에 타입을 먼저 태깅
  const taggedTilPosts = tilPosts.map(post => ({ ...post, type: 'til' as const }));
  const taggedArticlePosts = articlePosts.map(post => ({ ...post, type: 'article' as const }));
  const taggedReflectionPosts = reflectionPosts.map(post => ({ ...post, type: 'reflection' as const }));

  const allPosts = [...taggedTilPosts, ...taggedArticlePosts, ...taggedReflectionPosts];

  return allPosts
    .filter(post => post.tags.includes(tag))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .map(post => ({
      ...post,
      href: `/${post.type === 'article' ? 'articles' : post.type === 'reflection' ? 'reflections' : 'til'}/${post.slug}`,
    }));
}

export function searchPosts(query: string) {
  if (!query.trim()) {
    return [];
  }

  // 각 포스트에 타입을 먼저 태깅
  const taggedTilPosts = tilPosts.map(post => ({ ...post, type: 'til' as const }));
  const taggedArticlePosts = articlePosts.map(post => ({ ...post, type: 'article' as const }));
  const taggedReflectionPosts = reflectionPosts.map(post => ({ ...post, type: 'reflection' as const }));

  const allPosts = [...taggedTilPosts, ...taggedArticlePosts, ...taggedReflectionPosts];
  const lowerQuery = query.toLowerCase();

  return allPosts
    .filter(post => {
      const matchTitle = post.title.toLowerCase().includes(lowerQuery);
      const matchSubtitle = post.subtitle.toLowerCase().includes(lowerQuery);
      const matchTags = post.tags.some(tag => tag.toLowerCase().includes(lowerQuery));

      return matchTitle || matchSubtitle || matchTags;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .map(post => ({
      ...post,
      href: `/${post.type === 'article' ? 'articles' : post.type === 'reflection' ? 'reflections' : 'til'}/${post.slug}`,
    }));
}
