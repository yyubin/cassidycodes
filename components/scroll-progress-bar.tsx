'use client';

import { useState, useEffect } from 'react';

export function ScrollProgressBar() {
  const [width, setWidth] = useState(0);

  const handleScroll = () => {
    const { scrollTop, scrollHeight, clientHeight } = document.documentElement;

    if (scrollHeight === clientHeight) {
      setWidth(0);
      return;
    }

    const windowHeight = scrollHeight - clientHeight;
    const scrolled = (scrollTop / windowHeight) * 100;
    setWidth(scrolled);
  };

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, []);

  return (
    <div className="h-1 w-full bg-transparent fixed top-0 left-0 z-50">
      <div
        className="h-1 bg-cyan-600 dark:bg-cyan-400"
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
