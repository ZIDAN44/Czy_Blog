import './globals.css';
import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { ConfirmProvider } from '@/components/ConfirmDialog';
import { ToastProvider } from '@/components/Toast';
import { fontVariables } from '@czyblog/ui/fonts';
import { THEME_BOOTSTRAP } from '@czyblog/ui/theme';

export const metadata: Metadata = {
  title: { default: 'Dashboard · Czy Blog', template: '%s · Czy Blog' },
  description: 'Write and publish to Czy Blog',
};

export const viewport: Viewport = {
  viewportFit: 'cover',
};

// Read PUBLIC_SITE_URL per request so prebuilt images pick it up at runtime.
export const dynamic = 'force-dynamic';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Exposed to the client (site.ts) for links back to the reader.
  const siteUrl = process.env.PUBLIC_SITE_URL ?? 'http://localhost:3000';
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
        {/* Runtime reader origin for client links; runs before hydration. */}
        <Script
          id="site-url"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: `window.__SITE_URL__=${JSON.stringify(siteUrl)}` }}
        />
      </head>
      <body>
        <ToastProvider>
          <ConfirmProvider>{children}</ConfirmProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
