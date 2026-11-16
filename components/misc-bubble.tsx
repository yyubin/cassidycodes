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
  const displayContent = isLong && !isExpanded ? content.slice(0, maxLength) + '…' : content;

  const isMe = author === 'Me';
  const time = /T(\d{2}:\d{2})/.exec(date)?.[1];

  return (
    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-3 animate-fade-in`}>
      <div className={`max-w-[85%] md:max-w-[70%] ${isMe ? 'text-right' : 'text-left'}`}>
        <div
          onClick={() => isLong && setIsExpanded(!isExpanded)}
          className={`inline-block text-left px-4 py-2.5 rounded-md text-[15px] leading-relaxed ${
            isMe ? 'bg-fg text-bg' : 'bg-subtle text-fg border border-line'
          } ${isLong ? 'cursor-pointer' : ''}`}
        >
          <p className="whitespace-pre-wrap break-words">{displayContent}</p>

          {isLong && (
            <span className="block mt-1.5 font-mono text-[11px] opacity-60">
              {isExpanded ? '[ collapse ]' : '[ expand ]'}
            </span>
          )}
        </div>

        {time && (
          <time dateTime={date} className="block mt-1 px-1 font-mono text-[11px] text-muted tabular-nums">
            {time}
          </time>
        )}
      </div>
    </div>
  );
}
