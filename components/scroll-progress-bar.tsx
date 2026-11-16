'use client';

import { useState, useEffect } from 'react';

export function ScrollProgressBar() {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
      const scrollable = scrollHeight - clientHeight;
      setWidth(scrollable > 0 ? (scrollTop / scrollable) * 100 : 0);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="h-[2px] w-full fixed top-0 left-0 z-50 pointer-events-none">
      <div className="h-full bg-accent" style={{ width: `${width}%` }} />
    </div>
  );
}
