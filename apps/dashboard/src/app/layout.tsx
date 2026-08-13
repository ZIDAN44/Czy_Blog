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
  // theme-color is deliberately a single unmediated meta below, resolved by
  // the bootstrap script — see THEME_BOOTSTRAP for why.
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // No webfont round-trip: the platform font already carries optical sizing
    // and tracking tables, and it costs nothing on the input path.
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#fafafa" />
        {/* Applies a stored theme before first paint. Without it, a dark-mode
            reader gets a white flash on every navigation. It goes through
            next/script rather than a raw tag so React does not try to render
            it again on the client, where a script element would never run. */}
        <Script
          id="theme-bootstrap"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }}
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
