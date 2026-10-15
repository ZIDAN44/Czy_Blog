import './globals.css';
import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import Link from 'next/link';
import { Rss } from 'lucide-react';
import ReadHeader from '@/components/ReadHeader';
import Logo from '@/components/Logo';
import { fontVariables } from '@/lib/fonts';
import { THEME_BOOTSTRAP } from '@/lib/theme';

export const metadata: Metadata = {
  title: { default: 'Czy Blog', template: '%s · Czy Blog' },
  description: 'A personal blog of essays and notes on things worth thinking about.',
  alternates: { types: { 'application/rss+xml': '/rss.xml' } },
};

export const viewport: Viewport = {
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={fontVariables}
      suppressHydrationWarning
    >
      <head>
        <meta name="theme-color" content="#fbfaf7" />
        {/* Applies the stored theme before first paint (no dark-mode flash). */}
        <Script
          id="theme-bootstrap"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }}
        />
      </head>
      <body>
        <div className="min-h-screen flex flex-col">
          <ReadHeader />
          <main className="flex-1 w-full animate-fadeIn">{children}</main>
          <footer className="border-t border-line mt-24">
            <div className="max-w-5xl mx-auto px-5 sm:px-8 py-12 grid gap-8 sm:grid-cols-[1fr_auto] items-start">
              <div className="space-y-3 max-w-sm">
                <Link href="/" className="inline-flex items-center gap-2.5">
                  <Logo size={26} />
                  <span className="font-serif text-lg font-medium tracking-[-0.01em]">
                    Czy Blog
                  </span>
                </Link>
                <p className="t-secondary">
                  Essays and notes on things worth thinking about. Written slowly, published
                  occasionally.
                </p>
              </div>
              <div className="flex flex-col sm:items-end gap-3">
                <a href="/rss.xml" className="btn btn-secondary btn-sm">
                  <Rss /> Subscribe via RSS
                </a>
                <span className="t-caption">© {new Date().getFullYear()} Czy Blog</span>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
