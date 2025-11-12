import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { SearchInput } from '@/components/search-input';
import { TagCloud } from '@/components/tag-cloud';
import { getAllTags } from '@/lib/tags';

export default function Home() {
  const tags = getAllTags();

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-zinc-100 via-white to-zinc-200 dark:from-zinc-900 dark:via-zinc-950 dark:to-black transition-colors overflow-hidden">
      {/* Background shapes */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-cyan-200 rounded-full filter blur-3xl opacity-30 dark:bg-cyan-900"></div>
      <div className="absolute top-1/2 right-20 w-96 h-96 bg-purple-200 rounded-full filter blur-3xl opacity-30 dark:bg-purple-900"></div>
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-pink-200 rounded-full filter blur-3xl opacity-30 dark:bg-pink-900"></div>

      <div className="relative z-10">
        <Header />

        <main className="max-w-6xl mx-auto px-6 py-16">
          <div className="space-y-16">
            {/* Hero Section */}
            <div className="text-center space-y-6 py-12">
              <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 bg-clip-text text-transparent bg-[length:200%_auto] hover:animate-gradient">
                cassidycodes
              </h1>
              <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                GPT, 구글보다 스스로에게 먼저 묻자
              </p>
            </div>

            {/* Search Section */}
            <div className="space-y-8">
              <SearchInput />
            </div>

            {/* Tag Cloud Section */}
            <div className="pt-8">
              <TagCloud tags={tags} maxTags={30} />
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}
