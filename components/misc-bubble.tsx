'use client';

import { useState } from 'react';
import { MiscPost } from '@/types';

type MiscBubbleProps = {
  post: MiscPost;
  maxLength?: number;
};

export function MiscBubble({ post, maxLength = 150 }: MiscBubbleProps) {
  const { content, date, author } = post;
  const [isExpanded, setIsExpanded] = useState(false);
  const isLong = content.length > maxLength;
  const displayContent = isLong && !isExpanded
    ? content.slice(0, maxLength) + '...'
    : content;

  const isMe = author === 'Me';

  const bubbleAlignment = isMe ? 'justify-end' : 'justify-start';
  const bubbleBgColor = isMe
    ? 'bg-cyan-600 dark:bg-cyan-500 text-white'
    : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100';
  const bubbleBorderRadius = isMe
    ? 'rounded-2xl rounded-tr-sm'
    : 'rounded-2xl rounded-tl-sm';
  const timeAlignment = isMe ? 'mr-3 text-right' : 'ml-3 text-left';

  return (
    <div className={`flex ${bubbleAlignment} mb-4 animate-fade-in`}>
      <div className="max-w-[85%] md:max-w-[70%]">
        <div
          onClick={() => isLong && setIsExpanded(!isExpanded)}
          className={`
            relative px-5 py-3
            ${bubbleBgColor}
            ${bubbleBorderRadius}
            ${isLong ? 'cursor-pointer' : ''}
            transition-all duration-200
            shadow-sm hover:shadow-md
          `}
        >
          <p className="whitespace-pre-wrap break-words">
            {displayContent}
          </p>

          {isLong && (
            <div className={`mt-2 text-xs font-medium ${isMe ? 'text-cyan-100' : 'text-blue-600 dark:text-blue-400'}`}>
              {isExpanded ? '접기 ▲' : '더보기 ▼'}
            </div>
          )}
        </div>

        <div className={`mt-1 ${timeAlignment}`}>
          <time className="text-xs text-gray-500 dark:text-gray-500">
            {new Date(date).toLocaleDateString('ko-KR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </time>
        </div>
      </div>
    </div>
  );
}
