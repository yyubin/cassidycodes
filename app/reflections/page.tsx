import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { PostCard } from '@/components/post-card';
import { Reflection } from '@/types';
import { reflectionPosts } from '@/data/reflection-posts';

export default function ReflectionsPage() {
  // Group reflections by year
  const groupedByYear = reflectionPosts.reduce((acc, post) => {
    const year = new Date(post.date).getFullYear();
    if (!acc[year]) {
      acc[year] = [];
    }
    acc[year].push(post);
    return acc;
  }, {} as Record<number, Reflection[]>);

  // Sort years in descending order
  const yearSections = Object.keys(groupedByYear)
    .map(Number)
    .sort((a, b) => b - a)
    .map((year) => ({
      year,
      reflections: groupedByYear[year].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
    }));

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 transition-colors">
      <Header />

      <main className="max-w-4xl mx-auto px-6 py-16">
        <div className="space-y-12">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">
              Reflections
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Personal reflections and retrospectives
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Total {reflectionPosts.length} posts
            </p>
          </div>

          {yearSections.map((section) => (
            <div key={section.year} className="space-y-6">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-800 pb-3">
                {section.year}
              </h2>

              <div className="space-y-4">
                {section.reflections.length > 0 ? (
                  section.reflections.map((reflection) => (
                    <PostCard
                      key={reflection.id}
                      title={reflection.title}
                      subtitle={reflection.subtitle}
                      date={reflection.date}
                      tags={reflection.tags}
                      href={`/reflections/${reflection.slug}`}
                    />
                  ))
                ) : (
                  <div className="p-6 rounded-lg border border-gray-200 dark:border-gray-800 border-dashed">
                    <p className="text-gray-500 dark:text-gray-500 text-center text-sm">
                      {section.year}년 회고록이 아직 없습니다
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
