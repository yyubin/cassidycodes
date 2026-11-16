'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

type SearchInputProps = {
  defaultValue?: string;
  autoFocus?: boolean;
};

export function SearchInput({ defaultValue = '', autoFocus = false }: SearchInputProps) {
  const [query, setQuery] = useState(defaultValue);
  const router = useRouter();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} role="search" className="w-full">
      <label className="flex items-center gap-3 h-11 px-3 rounded-md border border-line bg-bg focus-within:border-accent transition-colors">
        <span className="font-mono text-sm text-accent select-none" aria-hidden="true">
          &gt;
        </span>
        <input
          type="search"
          value={query}
          autoFocus={autoFocus}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="제목, 부제, 태그로 검색"
          aria-label="검색어"
          className="flex-1 min-w-0 bg-transparent text-sm text-fg placeholder:text-muted focus:outline-none"
        />
        <button
          type="submit"
          className="font-mono text-xs text-muted border border-line rounded px-2 py-0.5 hover:text-fg hover:border-muted transition-colors"
        >
          enter ↵
        </button>
      </label>
    </form>
  );
}
