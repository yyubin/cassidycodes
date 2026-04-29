'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MermaidDiagram } from './mermaid-diagram';

interface DiagramModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  mermaidCode: string;
}

export function DiagramModal({
  isOpen,
  onClose,
  title,
  description,
  mermaidCode,
}: DiagramModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-6xl max-h-[90vh] bg-white dark:bg-zinc-900 rounded-xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 truncate">
              {title}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {description}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 p-2 rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="닫기"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Diagram */}
        <div className="flex-1 overflow-auto p-6">
          <MermaidDiagram chart={mermaidCode} />
        </div>

        {/* Footer hint */}
        <div className="flex-shrink-0 px-6 py-2 border-t border-gray-200 dark:border-gray-800 text-center">
          <span className="text-xs text-gray-400 dark:text-gray-600">
            ESC 또는 배경 클릭으로 닫기
          </span>
        </div>
      </div>
    </div>,
    document.body
  );
}
