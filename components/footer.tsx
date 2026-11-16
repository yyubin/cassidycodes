export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-line mt-auto">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono text-xs text-muted">
        <p>© {currentYear} 박유빈. All rights reserved.</p>

        <div className="flex items-center gap-5">
          <a
            href="https://github.com/yyubin"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-fg transition-colors"
          >
            github ↗
          </a>
          <a href="mailto:hazing0910@gmail.com" className="hover:text-fg transition-colors">
            email ↗
          </a>
        </div>
      </div>
    </footer>
  );
}
