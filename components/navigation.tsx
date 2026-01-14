'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const menuItems = [
  { name: 'Home', href: '/' },
  { name: 'TIL', href: '/til' },
  { name: 'Articles', href: '/articles' },
  { name: 'Reflections', href: '/reflections' },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-6">
      {menuItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`text-sm font-medium transition-colors ${
              isActive
                ? 'text-cyan-600 dark:text-cyan-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-cyan-600 dark:hover:text-cyan-400'
            }`}
          >
            {item.name}
          </Link>
        );
      })}
    </nav>
  );
}
