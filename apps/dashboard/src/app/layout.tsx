import './globals.css';
import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { ConfirmProvider } from '@/components/ConfirmDialog';
import { ToastProvider } from '@/components/Toast';
import { THEME_BOOTSTRAP } from '@/lib/theme';

export const metadata: Metadata = {
  title: 'Czy Blog | Dashboard',
  description: 'Write and publish to Czy Blog',
};

export const viewport: Viewport = {
  // Let the page reach under the notch so translucent chrome can float over it.
  viewportFit: 'cover',
  // theme-color is a single unmediated meta below, resolved by the bootstrap script (see THEME_BOOTSTRAP).
};

// Read PUBLIC_SITE_URL per request so prebuilt images pick it up at runtime.
export const dynamic = 'force-dynamic';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Exposed to the client (site.ts) for links back to the reader.
  const siteUrl = process.env.PUBLIC_SITE_URL ?? 'http://localhost:3000';
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
