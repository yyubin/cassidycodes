"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const menuItems = [
  { name: "articles", href: "/articles" },
  { name: "til", href: "/til" },
  { name: "reflections", href: "/reflections" },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-3 sm:gap-5 font-mono text-[13px] overflow-x-auto">
      {menuItems.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={`whitespace-nowrap transition-colors ${
              isActive ? "text-fg" : "text-muted hover:text-fg"
            }`}
          >
            {isActive && <span className="text-accent">/</span>}
            {item.name}
          </Link>
        );
      })}
      <Link
        href="/search"
        aria-label="Search"
        className={`transition-colors ${
          pathname === "/search" ? "text-fg" : "text-muted hover:text-fg"
        }`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path strokeLinecap="round" d="m20 20-3.5-3.5" />
        </svg>
      </Link>
    </nav>
  );
}
