import { ReactNode } from 'react';
import { Header } from './header';
import { Footer } from './footer';

type PageShellProps = {
  children: ReactNode;
  /** narrow: 목록/검색 페이지, wide: 본문 + 목차 */
  width?: 'narrow' | 'wide';
};

export function PageShell({ children, width = 'narrow' }: PageShellProps) {
  return (
    <div className="min-h-screen flex flex-col bg-bg text-fg">
      <Header />
      <main
        className={`w-full mx-auto px-4 sm:px-6 py-12 sm:py-16 flex-1 ${
          width === 'wide' ? 'max-w-5xl' : 'max-w-3xl'
        }`}
      >
        {children}
      </main>
      <Footer />
    </div>
  );
}

type PageHeaderProps = {
  label: string;
  title: string;
  description?: string;
  meta?: ReactNode;
};

export function PageHeader({ label, title, description, meta }: PageHeaderProps) {
  return (
    <div className="space-y-3 pb-8 border-b border-line">
      <p className="font-mono text-xs text-muted">
        <span className="text-accent">{'//'}</span> {label}
      </p>
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      {description && <p className="text-muted">{description}</p>}
      {meta && <div className="font-mono text-xs text-muted">{meta}</div>}
    </div>
  );
}
