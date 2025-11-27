import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { DiagramSection } from '@/components/diagram-section';
import { projects } from '@/data/projects';

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return projects.map((project) => ({
    slug: project.slug,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const project = projects.find((p) => p.slug === slug);

  if (!project) {
    return {
      title: 'Not Found',
    };
  }

  return {
    title: project.title,
    description: project.tldr,
    keywords: project.techStack,
    openGraph: {
      title: project.title,
      description: project.tldr,
      type: 'article',
      url: `/projects/${project.slug}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: project.title,
      description: project.tldr,
    },
  };
}

export default async function ProjectDetailPage({ params }: Props) {
  const { slug } = await params;
  const project = projects.find((p) => p.slug === slug);

  if (!project) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 transition-colors">
      <Header />

      <main className="max-w-4xl mx-auto px-6 py-16">
        <article className="space-y-8">
          {/* Header */}
          <header className="space-y-4 border-b border-gray-200 dark:border-gray-800 pb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-gray-100">
              {project.title}
            </h1>

            {project.role && (
              <p className="text-lg text-gray-600 dark:text-gray-400">
                {project.role}
              </p>
            )}

            {/* GitHub Link */}
            <div className="pt-2">
              <a
                href={project.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-cyan-600 dark:text-cyan-400 hover:underline"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                View on GitHub
              </a>
            </div>
          </header>

          {/* Hero Stats */}
          {project.heroStats && project.heroStats.length > 0 && (
            <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {project.heroStats.map((stat, index) => (
                <div
                  key={index}
                  className="p-4 rounded-lg bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 border border-cyan-200 dark:border-cyan-800"
                >
                  <div className="text-2xl md:text-3xl font-bold text-cyan-600 dark:text-cyan-400 mb-1">
                    {stat.value}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {stat.label}
                  </div>
                </div>
              ))}
            </section>
          )}

          {/* TL;DR */}
          <section className="p-6 rounded-lg bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800">
            <h2 className="text-lg font-bold text-cyan-900 dark:text-cyan-100 mb-3">
              TL;DR
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {project.tldr}
            </p>
          </section>

          {/* Architecture Diagrams */}
          {project.diagrams && project.diagrams.length > 0 && (
            <DiagramSection diagrams={project.diagrams} />
          )}

          {/* Reflection Article - 문제 정의 & 해결 과정 */}
          {project.reflectionArticle && (
            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                문제 정의 & 해결 과정
              </h2>
              <Link
                href={`/reflections/${project.reflectionArticle.slug}`}
                className="block p-6 rounded-lg border-2 border-cyan-200 dark:border-cyan-800 bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-900/10 dark:to-blue-900/10 hover:border-cyan-400 dark:hover:border-cyan-600 transition-all group"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                        📝 {project.reflectionArticle.title}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                        {project.reflectionArticle.description}
                      </p>
                    </div>
                    <svg
                      className="w-6 h-6 text-cyan-600 dark:text-cyan-400 group-hover:translate-x-1 transition-transform flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  <div className="text-sm text-cyan-600 dark:text-cyan-400 font-medium">
                    전체 글 읽기 →
                  </div>
                </div>
              </Link>
            </section>
          )}

          {/* Overview */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              개요
            </h2>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              {project.overview}
            </p>
          </section>

          {/* Achievements */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              핵심 성과
            </h2>
            <ul className="space-y-3">
              {project.achievements.map((achievement, index) => (
                <li key={index} className="flex gap-3">
                  <span className="text-cyan-600 dark:text-cyan-400 mt-1 flex-shrink-0">
                    ✓
                  </span>
                  <span className="text-gray-600 dark:text-gray-400 leading-relaxed">
                    {achievement}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {/* Tech Stack */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              기술 스택
            </h2>
            <div className="flex flex-wrap gap-2">
              {project.techStack.map((tech) => (
                <span
                  key={tech}
                  className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium"
                >
                  {tech}
                </span>
              ))}
            </div>
          </section>

          {/* Related Articles */}
          {project.relatedArticles.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                관련 블로그 글
              </h2>
              <div className="space-y-3">
                {project.relatedArticles.map((article) => (
                  <Link
                    key={article.slug}
                    href={`/${article.section}/${article.slug}`}
                    className="block p-4 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-cyan-400 dark:hover:border-cyan-600 transition-colors group"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-gray-700 dark:text-gray-300 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                        {article.title}
                      </span>
                      <svg
                        className="w-5 h-5 text-gray-400 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Back to Projects */}
          <div className="pt-8 border-t border-gray-200 dark:border-gray-800">
            <Link
              href="/projects"
              className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Projects
            </Link>
          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
}
