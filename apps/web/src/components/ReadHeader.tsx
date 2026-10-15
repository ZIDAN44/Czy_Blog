'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Logo from '@/components/Logo';
import ThemeToggle from '@/components/ThemeToggle';
import { useScrolled } from '@/lib/useMotion';

// Floating chrome: the page scrolls under it; the edge appears once scrolled.
export default function ReadHeader() {
  const scrolled = useScrolled();
  const pathname = usePathname();

  return (
    <header
      className="chrome sticky top-0 z-30"
      data-scrolled={scrolled}
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="max-w-5xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5 pressable">
          <Logo size={30} />
          <span className="font-serif text-[1.3125rem] font-medium tracking-[-0.015em]">
            Czy Blog
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link
            href="/"
            aria-current={pathname === '/' ? 'page' : undefined}
            className="hidden sm:inline-flex h-8 items-center px-3 rounded-lg text-content-secondary hover:text-content hover:bg-fill-hover aria-[current=page]:text-content"
          >
            Writing
          </Link>
          <a
            href="/rss.xml"
            className="hidden sm:inline-flex h-8 items-center px-3 rounded-lg text-content-secondary hover:text-content hover:bg-fill-hover"
          >
            RSS
          </a>
          <span className="hidden sm:block w-px h-5 bg-line mx-2" aria-hidden />
          <ThemeToggle compact />
        </nav>
      </div>
    </header>
  );
}
