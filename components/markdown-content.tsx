"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  oneDark,
  oneLight,
} from "react-syntax-highlighter/dist/cjs/styles/prism";
import { useTheme } from "next-themes";
import { MermaidDiagram } from "./mermaid-diagram";
import "katex/dist/katex.min.css";

interface MarkdownContentProps {
  content: string;
}

const CODE_FONT = 'var(--font-jetbrains-mono), "JetBrains Mono", ui-monospace, monospace';

function CodeFrame({ language, children }: { language: string; children: React.ReactNode }) {
  return (
    <div className="my-6 rounded-md border border-line bg-code overflow-hidden">
      <div className="px-4 py-1.5 border-b border-line font-mono text-[11px] text-muted select-none">
        {language}
      </div>
      {children}
    </div>
  );
}

export function MarkdownContent({ content }: MarkdownContentProps) {
  const { resolvedTheme } = useTheme();

  return (
    <div className="text-[15.5px] sm:text-base">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[
          rehypeRaw,
          rehypeSlug,
          [
            rehypeAutolinkHeadings,
            {
              behavior: "wrap",
              properties: { className: ["anchor-link"] },
            },
          ],
          rehypeKatex,
        ]}
        components={{
          code({
            className,
            children,
            ...props
          }: React.HTMLAttributes<HTMLElement> & { inline?: boolean }) {
            const match = /language-(\w+)/.exec(className || "");

            if (match) {
              const language = match[1];
              const code = String(children).replace(/\n$/, "");

              if (language === "mermaid") {
                return <MermaidDiagram chart={code} />;
              }
              if (language === "plain") {
                return (
                  <CodeFrame language="text">
                    <pre
                      className="p-4 overflow-x-auto text-sm leading-relaxed text-fg"
                      style={{ fontFamily: CODE_FONT }}>
                      <code>{code}</code>
                    </pre>
                  </CodeFrame>
                );
              }
              return (
                <CodeFrame language={language}>
                  <SyntaxHighlighter
                    style={(resolvedTheme === "dark" ? oneDark : oneLight) as any}
                    language={language}
                    PreTag="div"
                    customStyle={{
                      margin: 0,
                      padding: "1rem",
                      borderRadius: 0,
                      background: "transparent",
                      fontSize: "0.85rem",
                      lineHeight: 1.65,
                      fontFamily: CODE_FONT,
                    }}
                    codeTagProps={{
                      style: { background: "transparent", fontFamily: CODE_FONT },
                    }}
                    {...props}>
                    {code}
                  </SyntaxHighlighter>
                </CodeFrame>
              );
            }

            return (
              <code
                className="px-1.5 py-0.5 rounded bg-subtle border border-line text-[0.85em] font-mono text-fg"
                {...props}>
                {children}
              </code>
            );
          },

          a({
            href,
            children,
            ...props
          }: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
            const isExternal = href?.startsWith("http");
            return (
              <a
                href={href}
                target={isExternal ? "_blank" : undefined}
                rel={isExternal ? "noopener noreferrer" : undefined}
                className="text-accent underline decoration-accent/30 underline-offset-[3px] hover:decoration-accent transition-colors"
                {...props}>
                {children}
                {isExternal && <span className="ml-0.5 text-[0.75em] no-underline">↗</span>}
              </a>
            );
          },

          h1({ children, ...props }) {
            return (
              <h1
                className="text-2xl sm:text-3xl font-semibold tracking-tight mt-12 mb-4 text-fg"
                {...props}>
                {children}
              </h1>
            );
          },

          h2({ children, ...props }) {
            return (
              <h2
                className="text-xl sm:text-2xl font-semibold tracking-tight mt-12 mb-4 pb-2 border-b border-line text-fg"
                {...props}>
                {children}
              </h2>
            );
          },

          h3({ children, ...props }) {
            return (
              <h3
                className="text-lg sm:text-xl font-semibold tracking-tight mt-8 mb-3 text-fg"
                {...props}>
                {children}
              </h3>
            );
          },

          h4({ children, ...props }) {
            return (
              <h4 className="text-base font-semibold mt-6 mb-2 text-fg" {...props}>
                {children}
              </h4>
            );
          },

          blockquote({ children, ...props }) {
            return (
              <blockquote
                className="my-6 pl-4 border-l-2 border-accent text-muted [&>p]:text-muted"
                {...props}>
                {children}
              </blockquote>
            );
          },

          table({ children, ...props }) {
            return (
              <div className="my-6 overflow-x-auto border border-line rounded-md">
                <table className="min-w-full text-sm border-collapse" {...props}>
                  {children}
                </table>
              </div>
            );
          },

          thead({ children, ...props }) {
            return (
              <thead className="bg-subtle" {...props}>
                {children}
              </thead>
            );
          },

          th({ children, ...props }) {
            return (
              <th
                className="px-4 py-2 text-left font-semibold text-fg border-b border-line whitespace-nowrap"
                {...props}>
                {children}
              </th>
            );
          },

          td({ children, ...props }) {
            return (
              <td
                className="px-4 py-2 text-fg/90 border-b border-line align-top"
                {...props}>
                {children}
              </td>
            );
          },

          ul({ children, ...props }) {
            return (
              <ul
                className="list-disc list-outside my-4 pl-6 space-y-1.5 marker:text-muted"
                {...props}>
                {children}
              </ul>
            );
          },

          ol({ children, ...props }) {
            return (
              <ol
                className="list-decimal list-outside my-4 pl-6 space-y-1.5 marker:text-muted marker:font-mono marker:text-sm"
                {...props}>
                {children}
              </ol>
            );
          },

          li({ children, ...props }) {
            return (
              <li className="pl-1 text-fg/90 leading-7" {...props}>
                {children}
              </li>
            );
          },

          img({ src, alt, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) {
            return (
              <span className="block my-8">
                <img
                  src={src}
                  alt={alt}
                  className="max-w-full h-auto mx-auto rounded-md border border-line"
                  {...props}
                />
                {alt && (
                  <span className="block text-center font-mono text-xs text-muted mt-2">
                    {alt}
                  </span>
                )}
              </span>
            );
          },

          hr(props) {
            return <hr className="my-10 border-line" {...props} />;
          },

          details({ children, ...props }) {
            return (
              <details
                className="my-4 px-4 py-3 border border-line rounded-md bg-subtle/50"
                {...props}>
                {children}
              </details>
            );
          },

          summary({ children, ...props }) {
            return (
              <summary
                className="cursor-pointer font-mono text-sm text-fg hover:text-accent select-none"
                {...props}>
                {children}
              </summary>
            );
          },

          p({ children, ...props }) {
            return (
              <p className="my-4 text-fg/90 leading-7" {...props}>
                {children}
              </p>
            );
          },

          strong({ children, ...props }) {
            return (
              <strong className="font-semibold text-fg" {...props}>
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
        }}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
