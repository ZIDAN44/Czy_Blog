import './globals.css';
import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import ReadHeader from '@/components/ReadHeader';
import { THEME_BOOTSTRAP } from '@/lib/theme';

export const metadata: Metadata = {
  title: 'Czy Blog',
  description: 'A quiet corner of the internet where ideas get the time they deserve.',
};

export const viewport: Viewport = {
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // No webfont round-trip — the platform font already carries optical sizing and tracking.
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#fafafa" />
        {/* Applies the stored theme before first paint (else a dark-mode flash).
            Via next/script so React doesn't re-render it client-side, where it wouldn't run. */}
        <Script
          id="theme-bootstrap"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }}
        />
      </head>
      <body>
        <div className="min-h-screen flex flex-col bg-surface">
          <ReadHeader />
          <main className="max-w-3xl mx-auto px-6 py-12 w-full animate-fadeIn">{children}</main>
          <footer className="border-t border-line mt-auto">
            <div className="max-w-3xl mx-auto px-6 py-10 space-y-6">
              <p className="t-body text-content-secondary max-w-xl">
                Czy Blog is a small place for slow thinking — long walks turned into paragraphs,
                half-finished thoughts that found their footing, and the occasional thing worth
                saying twice.
              </p>
              <div className="flex items-center justify-between gap-4 t-caption">
                <span>© {new Date().getFullYear()} Czy Blog · made with care</span>
                <a href="/rss.xml" className="hover:text-content">
                  Subscribe via RSS →
                </a>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
