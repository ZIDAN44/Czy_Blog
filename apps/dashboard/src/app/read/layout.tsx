import type { Metadata } from 'next';
import ReadHeader from '@/components/ReadHeader';

export const metadata: Metadata = { title: 'Czy Blog' };

export default function ReadLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <ReadHeader />
      <main className="max-w-3xl mx-auto px-6 py-12 w-full animate-fadeIn">{children}</main>
      <footer className="border-t border-line mt-auto">
        <div className="max-w-3xl mx-auto px-6 py-10 space-y-6">
          <p className="t-body text-content-secondary max-w-xl">
            Czy Blog is a small place for slow thinking — long walks turned into paragraphs,
            half-finished thoughts that found their footing, and the occasional thing worth saying
            twice.
          </p>
          <div className="flex items-center justify-between gap-4 t-caption">
            <span>© {new Date().getFullYear()} Czy Blog · made with care</span>
            <a href="/api-proxy/rss.xml" className="hover:text-content">
              Subscribe via RSS →
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
