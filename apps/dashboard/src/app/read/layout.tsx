import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Czy Blog' };

export default function ReadLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <header className="border-b">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/read" className="font-bold text-lg">
            Czy Blog
          </Link>
          <nav className="text-sm text-slate-500 flex gap-4">
            <Link href="/read" className="hover:text-slate-900">
              Posts
            </Link>
            <a href="/api-proxy/rss.xml" className="hover:text-slate-900">
              RSS
            </a>
            <Link href="/dashboard" className="hover:text-slate-900">
              Dashboard
            </Link>
          </nav>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-10 w-full">{children}</main>
      <footer className="border-t mt-auto">
        <div className="max-w-3xl mx-auto px-6 py-4 text-xs text-slate-400">
          Czy Blog · headless content powered by the JSON API
        </div>
      </footer>
    </div>
  );
}
