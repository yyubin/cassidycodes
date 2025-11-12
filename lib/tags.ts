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
  const allPosts = [...tilPosts, ...articlePosts, ...reflectionPosts];

  return allPosts
    .filter(post => post.tags.includes(tag))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .map(post => {
      // 포스트 타입 판별
      let type: 'til' | 'article' | 'reflection' = 'til';
      if (articlePosts.find(p => p.id === post.id)) {
        type = 'article';
      } else if (reflectionPosts.find(p => p.id === post.id)) {
        type = 'reflection';
      }

      return {
        ...post,
        type,
        href: `/${type === 'article' ? 'articles' : type === 'reflection' ? 'reflections' : 'til'}/${post.slug}`,
      };
    });
}

export function searchPosts(query: string) {
  if (!query.trim()) {
    return [];
  }

  const allPosts = [...tilPosts, ...articlePosts, ...reflectionPosts];
  const lowerQuery = query.toLowerCase();

  return allPosts
    .filter(post => {
      const matchTitle = post.title.toLowerCase().includes(lowerQuery);
      const matchSubtitle = post.subtitle.toLowerCase().includes(lowerQuery);
      const matchTags = post.tags.some(tag => tag.toLowerCase().includes(lowerQuery));

      return matchTitle || matchSubtitle || matchTags;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .map(post => {
      // 포스트 타입 판별
      let type: 'til' | 'article' | 'reflection' = 'til';
      if (articlePosts.find(p => p.id === post.id)) {
        type = 'article';
      } else if (reflectionPosts.find(p => p.id === post.id)) {
        type = 'reflection';
      }

      return {
        ...post,
        type,
        href: `/${type === 'article' ? 'articles' : type === 'reflection' ? 'reflections' : 'til'}/${post.slug}`,
      };
    });
}
