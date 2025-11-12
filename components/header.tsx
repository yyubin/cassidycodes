import Link from 'next/link';
import { Navigation } from './navigation';
import { ThemeToggle } from './theme-toggle';
import { ScrollProgressBar } from './scroll-progress-bar';

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm">
      <ScrollProgressBar />
      <div className="max-w-6xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 bg-clip-text text-transparent bg-[length:200%_auto] hover:animate-gradient">
            cassidycodes
          </Link>

          <div className="hidden md:block">
            <Navigation />
          </div>

          <ThemeToggle />
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden mt-4">
          <Navigation />
        </div>
      </div>
    </header>
  );
}
