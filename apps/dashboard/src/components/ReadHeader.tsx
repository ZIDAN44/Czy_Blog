'use client';
import Link from 'next/link';
import Logo from '@/components/Logo';
import ThemeToggle from '@/components/ThemeToggle';
import { useScrolled } from '@/lib/useMotion';

// Floating chrome: the page scrolls under it, and the separation appears only once scrolled.
export default function ReadHeader() {
  const scrolled = useScrolled();

  return (
    <header
      className="chrome sticky top-0 z-30"
      data-scrolled={scrolled}
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/read" className="flex items-center gap-2 pressable">
          <Logo className="w-7 h-7 text-content" />
          <span className="font-semibold tracking-tight">Czy Blog</span>
        </Link>
        <nav className="text-sm flex items-center gap-1">
          <Link
            href="/read"
            className="px-2.5 py-1 rounded-lg text-content-secondary hover:text-content hover:bg-fill-hover"
          >
            Posts
          </Link>
          <a
            href="/api-proxy/rss.xml"
            className="px-2.5 py-1 rounded-lg text-content-secondary hover:text-content hover:bg-fill-hover"
          >
            RSS
          </a>
          {/* Glyphs, not words, for the narrow reader chrome; each segment keeps a spoken label. */}
          <ThemeToggle compact />
        </nav>
      </div>
    </header>
  );
}
