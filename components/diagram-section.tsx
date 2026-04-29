'use client';

import { useState } from 'react';
import { MermaidDiagram } from './mermaid-diagram';
import { DiagramModal } from './diagram-modal';

interface Diagram {
  title: string;
  description: string;
  mermaidCode: string;
}

interface DiagramSectionProps {
  diagrams: Diagram[];
}

export function DiagramSection({ diagrams }: DiagramSectionProps) {
  const [openDiagrams, setOpenDiagrams] = useState<Record<number, boolean>>({});
  const [modalDiagram, setModalDiagram] = useState<Diagram | null>(null);

  const toggleDiagram = (index: number) => {
    setOpenDiagrams((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  return (
    <>
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
                <div className="bg-white dark:bg-zinc-900 border-t border-gray-200 dark:border-gray-800">
                  {/* Expand button */}
                  <div className="flex justify-end px-4 pt-3">
                    <button
                      onClick={() => setModalDiagram(diagram)}
                      className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                      </svg>
                      전체 화면으로 보기
                    </button>
                  </div>

                  {/* Diagram — click to open modal */}
                  <div
                    className="p-6 cursor-zoom-in"
                    onClick={() => setModalDiagram(diagram)}
                    title="클릭하여 전체 화면으로 보기"
                  >
                    <MermaidDiagram chart={diagram.mermaidCode} />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <DiagramModal
        isOpen={modalDiagram !== null}
        onClose={() => setModalDiagram(null)}
        title={modalDiagram?.title ?? ''}
        description={modalDiagram?.description ?? ''}
        mermaidCode={modalDiagram?.mermaidCode ?? ''}
      />
    </>
  );
}
