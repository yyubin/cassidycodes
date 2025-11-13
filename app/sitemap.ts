import { MetadataRoute } from 'next';
import { articlePosts } from '@/data/article-posts';
import { tilPosts } from '@/data/til-posts';
import { reflectionPosts } from '@/data/reflection-posts';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://cassidycodes.vercel.app';

  // Static pages
  const staticPages = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1,
    },
    {
      url: `${baseUrl}/articles`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/til`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/reflections`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/misc`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.6,
    },
    {
      url: `${baseUrl}/tags`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    },
    {
      url: `${baseUrl}/search`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    },
  ];

  // Article posts
  const articles = articlePosts.map((post) => ({
    url: `${baseUrl}/articles/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: 'monthly' as const,
    priority: 0.9,
  }));

  // TIL posts
  const tils = tilPosts.map((post) => ({
    url: `${baseUrl}/til/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  // Reflection posts
  const reflections = reflectionPosts.map((post) => ({
    url: `${baseUrl}/reflections/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }));

  return [...staticPages, ...articles, ...tils, ...reflections];
}
