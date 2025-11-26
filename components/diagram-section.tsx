'use client';

import { useState } from 'react';
import { MermaidDiagram } from './mermaid-diagram';

interface DiagramSectionProps {
  diagrams: {
    title: string;
    description: string;
    mermaidCode: string;
  }[];
}

export function DiagramSection({ diagrams }: DiagramSectionProps) {
  const [openDiagrams, setOpenDiagrams] = useState<Record<number, boolean>>({});

  const toggleDiagram = (index: number) => {
    setOpenDiagrams((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
        📊 핵심 아키텍처
      </h2>
      <div className="space-y-4">
        {diagrams.map((diagram, index) => (
          <div
            key={index}
            className="rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden"
          >
            {/* Toggle Header */}
            <button
              onClick={() => toggleDiagram(index)}
              className="w-full p-4 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="flex-1 text-left">
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">
                  {diagram.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {diagram.description}
                </p>
              </div>
              <svg
                className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform flex-shrink-0 ml-4 ${
                  openDiagrams[index] ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {/* Toggle Content */}
            {openDiagrams[index] && (
              <div className="p-6 bg-white dark:bg-zinc-900 border-t border-gray-200 dark:border-gray-800">
                <MermaidDiagram chart={diagram.mermaidCode} />
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
