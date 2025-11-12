import { Header } from './header';
import { Footer } from './footer';

type PostDetailProps = {
  title: string;
  subtitle: string;
  date: string;
  tags: string[];
  content: string;
};

export function PostDetail({ title, subtitle, date, tags, content }: PostDetailProps) {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 transition-colors">
      <Header />

      <main className="max-w-3xl mx-auto px-6 py-16">
        <article className="space-y-8">
          {/* Header */}
          <header className="space-y-4 border-b border-gray-200 dark:border-gray-800 pb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-gray-100 hover:bg-cyan-600">
              {title}
            </h1>

            <p className="text-xl text-gray-600 dark:text-gray-400">
              {subtitle}
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              {/* Date */}
              <time className="text-sm text-gray-500 dark:text-gray-500">
                {new Date(date).toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </time>

              {/* Tags */}
              {tags.length > 0 && (
                <>
                  <span className="text-gray-300 dark:text-gray-700">•</span>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-md"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>
          </header>

          {/* Content */}
          <div className="prose prose-gray dark:prose-invert max-w-none">
            <div
              className="text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
}
