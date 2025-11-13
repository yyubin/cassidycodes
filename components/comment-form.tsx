'use client';

import { useState } from 'react';
import { addComment } from '@/lib/comments';

export function CommentForm() {
  const [author, setAuthor] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!author.trim() || !content.trim()) {
      alert('이름과 내용을 모두 입력해주세요.');
      return;
    }

    setIsSubmitting(true);

    try {
      // 해시값과 일치하면 "cassidy"로 변환
      const adminHash = process.env.NEXT_PUBLIC_ADMIN_HASH;
      const finalAuthor = author.trim() === adminHash ? 'cassidy' : author.trim();

      console.log('입력한 이름:', author.trim());
      console.log('해시값:', adminHash);
      console.log('최종 저장될 이름:', finalAuthor);

      const newComment = await addComment(finalAuthor, content.trim());

      if (newComment) {
        // 입력 필드 초기화
        setContent('');
        // author는 초기화하지 않고 유지
      } else {
        alert('댓글 작성에 실패했습니다. 다시 시도해주세요.');
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
      alert('댓글 작성 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-zinc-900 border-t border-gray-200 dark:border-gray-800 shadow-lg z-50">
      <div className="max-w-4xl mx-auto px-4 py-3">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            type="text"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="이름"
            className="w-24 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-zinc-950 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400 text-sm"
            disabled={isSubmitting}
          />

          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="메시지를 입력하세요"
            className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-zinc-950 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400"
            disabled={isSubmitting}
          />

          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-cyan-600 dark:bg-cyan-500 text-white font-medium rounded-lg hover:bg-cyan-700 dark:hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
          >
            {isSubmitting ? 'Sending...' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
}
