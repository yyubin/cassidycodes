'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export function SearchInput() {
  const [query, setQuery] = useState('');
  const router = useRouter();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto">
      <div className="relative">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="검색어를 입력하세요"
          className="w-full px-6 py-4 text-lg rounded-full border-2 border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 focus:border-cyan-500 dark:focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 dark:focus:ring-cyan-400/20 transition-all"
        />
        <button
          type="submit"
          className="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-2 bg-cyan-600 dark:bg-cyan-500 text-white rounded-full font-medium transition-colors hover:bg-zinc-800/10"
        >
          search
        </button>
      </div>

      {/* 검색 힌트 */}
      <p className="mt-3 text-sm text-gray-500 dark:text-gray-500 text-center">
        제목, 내용, 태그로 검색할 수 있습니다
      </p>
    </form>
  );
}
