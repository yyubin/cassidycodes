'use client';

import { useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';

export function GiscusComments() {
  const ref = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (!ref.current || ref.current.hasChildNodes()) return;

    const script = document.createElement('script');
    script.src = 'https://giscus.app/client.js';
    script.setAttribute('data-repo', 'yyubin/cassidycodes');
    script.setAttribute('data-repo-id', 'R_kgDOQUB7hQ');
    script.setAttribute('data-category', 'Announcements');
    script.setAttribute('data-category-id', 'DIC_kwDOQUB7hc4Cxvqj');
    script.setAttribute('data-mapping', 'pathname');
    script.setAttribute('data-strict', '0');
    script.setAttribute('data-reactions-enabled', '1');
    script.setAttribute('data-emit-metadata', '0');
    script.setAttribute('data-input-position', 'bottom');
    script.setAttribute('data-theme', resolvedTheme === 'dark' ? 'dark' : 'light');
    script.setAttribute('data-lang', 'ko');
    script.setAttribute('crossorigin', 'anonymous');
    script.async = true;

    ref.current.appendChild(script);
  }, [resolvedTheme]);

  // 테마 변경 시 giscus 테마도 업데이트
  useEffect(() => {
    const iframe = document.querySelector<HTMLIFrameElement>('iframe.giscus-frame');
    if (!iframe) return;

    iframe.contentWindow?.postMessage(
      {
        giscus: {
          setConfig: {
            theme: resolvedTheme === 'dark' ? 'dark' : 'light',
          },
        },
      },
      'https://giscus.app'
    );
  }, [resolvedTheme]);

  return (
    <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-800">
      <div ref={ref} />
    </div>
  );
}
