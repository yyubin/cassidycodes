'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { useTheme } from 'next-themes';
import 'katex/dist/katex.min.css';

interface MarkdownContentProps {
  content: string;
}

export function MarkdownContent({ content }: MarkdownContentProps) {
  const { theme } = useTheme();

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[
        rehypeRaw,
        rehypeSlug,
        [
          rehypeAutolinkHeadings,
          {
            behavior: 'wrap',
            properties: { className: ['anchor-link'] },
          },
        ],
        rehypeKatex,
      ]}
      components={{
        // 코드 블록 하이라이팅
        code({ className, children, ...props }: React.HTMLAttributes<HTMLElement>) {
          const match = /language-(\w+)/.exec(className || '');

          if (match) {
            return (
              <SyntaxHighlighter
                style={(theme === 'dark' ? oneDark : oneLight) as any}
                language={match[1]}
                PreTag="div"
                customStyle={{
                  margin: '1.5rem 0',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                }}
                {...props}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            );
          }

          return (
            <code
              className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-sm font-mono"
              {...props}
            >
              {children}
            </code>
          );
        },

        a({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
          const isExternal = href?.startsWith('http');
          return (
            <a
              href={href}
              target={isExternal ? '_blank' : undefined}
              rel={isExternal ? 'noopener noreferrer' : undefined}
              className="text-cyan-600 dark:text-cyan-400 hover:underline font-medium"
              {...props}
            >
              {children}
              {isExternal && <span className="ml-1 text-xs">↗</span>}
            </a>
          );
        },

        h1({ children, ...props }) {
          return (
            <h1
              className="text-3xl md:text-4xl font-bold mt-8 mb-4 text-gray-900 dark:text-gray-100 group"
              {...props}
            >
              {children}
            </h1>
          );
        },

        h2({ children, ...props }) {
          return (
            <h2
              className="text-2xl md:text-3xl font-bold mt-8 mb-4 text-gray-900 dark:text-gray-100 group"
              {...props}
            >
              {children}
            </h2>
          );
        },

        h3({ children, ...props }) {
          return (
            <h3
              className="text-xl md:text-2xl font-bold mt-6 mb-3 text-gray-900 dark:text-gray-100 group"
              {...props}
            >
              {children}
            </h3>
          );
        },

        h4({ children, ...props }) {
          return (
            <h4
              className="text-lg md:text-xl font-bold mt-6 mb-3 text-gray-900 dark:text-gray-100"
              {...props}
            >
              {children}
            </h4>
          );
        },

        blockquote({ children, ...props }) {
          return (
            <blockquote
              className="border-l-4 border-cyan-500 dark:border-cyan-400 pl-4 py-2 my-4 italic text-gray-700 dark:text-gray-300 bg-cyan-50 dark:bg-cyan-950/30 rounded-r"
              {...props}
            >
              {children}
            </blockquote>
          );
        },

        table({ children, ...props }) {
          return (
            <div className="overflow-x-auto my-6">
              <table
                className="min-w-full border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden"
                {...props}
              >
                {children}
              </table>
            </div>
          );
        },

        thead({ children, ...props }) {
          return (
            <thead className="bg-gray-100 dark:bg-gray-800" {...props}>
              {children}
            </thead>
          );
        },

        th({ children, ...props }) {
          return (
            <th
              className="px-4 py-2 text-left font-semibold text-gray-900 dark:text-gray-100 border-b border-gray-300 dark:border-gray-700"
              {...props}
            >
              {children}
            </th>
          );
        },

        td({ children, ...props }) {
          return (
            <td
              className="px-4 py-2 text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-800"
              {...props}
            >
              {children}
            </td>
          );
        },

        ul({ children, ...props }) {
          return (
            <ul
              className="list-disc list-outside my-4 ml-6 space-y-2 text-gray-700 dark:text-gray-300"
              {...props}
            >
              {children}
            </ul>
          );
        },

        ol({ children, ...props }) {
          return (
            <ol
              className="list-decimal list-outside my-4 ml-6 space-y-2 text-gray-700 dark:text-gray-300"
              {...props}
            >
              {children}
            </ol>
          );
        },

        li({ children, ...props }) {
          return (
            <li
              className="ml-2 pl-2 text-gray-700 dark:text-gray-300 leading-relaxed"
              {...props}
            >
              {children}
            </li>
          );
        },

        img({ src, alt, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) {
          return (
            <span className="block my-6">
              <img
                src={src}
                alt={alt}
                className="rounded-lg max-w-full h-auto mx-auto shadow-lg"
                {...props}
              />
              {alt && (
                <span className="block text-center text-sm text-gray-500 dark:text-gray-500 mt-2">
                  {alt}
                </span>
              )}
            </span>
          );
        },

        hr(props) {
          return <hr className="my-8 border-gray-300 dark:border-gray-700" {...props} />;
        },

        details({ children, ...props }) {
          return (
            <details
              className="my-4 p-4 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900/50"
              {...props}
            >
              {children}
            </details>
          );
        },

        summary({ children, ...props }) {
          return (
            <summary
              className="cursor-pointer font-semibold text-gray-900 dark:text-gray-100 hover:text-cyan-600 dark:hover:text-cyan-400 select-none"
              {...props}
            >
              {children}
            </summary>
          );
        },

        p({ children, ...props }) {
          return (
            <p
              className="my-4 text-gray-700 dark:text-gray-300 leading-relaxed"
              {...props}
            >
              {children}
            </p>
          );
        },

        strong({ children, ...props }) {
          return (
            <strong className="font-bold text-gray-900 dark:text-gray-100" {...props}>
              {children}
            </strong>
          );
        },

        em({ children, ...props }) {
          return (
            <em className="italic" {...props}>
              {children}
            </em>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}