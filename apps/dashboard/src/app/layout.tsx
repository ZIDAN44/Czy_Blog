import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Czy Blog Dashboard',
  description: 'Write and publish to Czy Blog',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
