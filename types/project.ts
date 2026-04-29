export type Project = {
  id: string;
  title: string;
  slug: string;
  tldr: string;
  overview: string;
  achievements: string[];
  techStack: string[];
  relatedArticles: {
    title: string;
    section: string;
    slug: string;
  }[];
  githubUrl: string;
  externalLinks?: {
    label: string;
    url: string;
  }[];
  role?: string;
  heroStats?: {
    label: string;
    value: string;
  }[];
  reflectionArticle?: {
    title: string;
    slug: string;
    description: string;
  };
  diagrams?: {
    title: string;
    description: string;
    mermaidFile: string;
  }[];
  retrospective?: {
    summary: string;
    learnings: string[];
  };
};
