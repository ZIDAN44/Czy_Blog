import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Czy Blog' };

export default function ReadLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <header className="sticky top-0 z-30 backdrop-blur-md bg-white/80 border-b border-slate-200/60">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/read" className="flex items-center gap-2 group">
            <span className="grid place-items-center w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-bold text-sm">
              C
            </span>
            <span className="font-semibold tracking-tight">Czy Blog</span>
          </Link>
          <nav className="text-sm text-slate-500 flex items-center gap-1">
            <Link
              href="/read"
              className="px-2.5 py-1 rounded-md hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              Posts
            </Link>
            <a
              href="/api-proxy/rss.xml"
              className="px-2.5 py-1 rounded-md hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              RSS
            </a>
          </nav>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-12 w-full animate-fadeIn">{children}</main>
      <footer className="border-t border-slate-200/60 mt-auto">
        <div className="max-w-3xl mx-auto px-6 py-10 space-y-6">
          <p className="text-sm text-slate-600 leading-relaxed max-w-xl">
            Czy Blog is a small place for slow thinking | Long walks turned into paragraphs,
            half-finished thoughts that found their footing | The occasional thing worth saying
            twice!
          </p>
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>© {new Date().getFullYear()} Czy Blog · made with care ·</span>
            <a href="/api-proxy/rss.xml" className="hover:text-slate-900 transition-colors">
              Subscribe via RSS →
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
