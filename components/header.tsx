import Link from 'next/link';
import { Navigation } from './navigation';
import { ThemeToggle } from './theme-toggle';
import { ScrollProgressBar } from './scroll-progress-bar';

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-bg/85 backdrop-blur-md">
      <ScrollProgressBar />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        <Link
          href="/"
          className="font-mono text-sm font-semibold tracking-tight text-fg hover:text-accent transition-colors shrink-0"
        >
          <span className="text-accent">~/</span>cassidycodes
        </Link>

        <div className="flex items-center gap-6">
          <div className="hidden sm:block">
            <Navigation />
          </div>
          <ThemeToggle />
        </div>
      </div>

      {/* Mobile navigation */}
      <div className="sm:hidden border-t border-line">
        <div className="px-4 h-10 flex items-center">
          <Navigation />
        </div>
      </div>
    </header>
  );
}
