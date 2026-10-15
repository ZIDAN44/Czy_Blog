import { Rss } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function Hero({
  total,
  lastPublished,
}: {
  total: number;
  lastPublished?: string | null;
}) {
  return (
    <section className="pt-14 sm:pt-20 pb-12 sm:pb-16 border-b border-line">
      <p className="t-label text-accent">Essays &amp; notes</p>
      <h1 className="t-serif-display mt-4 text-[clamp(2.375rem,1.6rem+3.4vw,4rem)] max-w-[16ch] text-balance">
        On things worth thinking about, slowly.
      </h1>
      <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 t-secondary">
        {total > 0 && (
          <span>
            {total} {total === 1 ? 'piece' : 'pieces'}
            {lastPublished && <> · last published {formatDate(lastPublished, 'long')}</>}
          </span>
        )}
        <a href="/rss.xml" className="inline-flex items-center gap-1.5 link">
          <Rss className="w-3.5 h-3.5" /> Follow via RSS
        </a>
      </div>
    </section>
  );
}

/** The two non-list outcomes: API down, or nothing published yet. */
export function IndexNotice({ unreachable }: { unreachable: boolean }) {
  return unreachable ? (
    <div className="my-16 card px-6 py-12 text-center">
      <p className="t-heading">The posts could not be loaded just now.</p>
      <p className="t-secondary mt-1.5">Refresh in a moment — nothing has been lost.</p>
    </div>
  ) : (
    <div className="my-16 py-16 text-center">
      <p className="font-serif text-2xl">Nothing published yet.</p>
      <p className="t-secondary mt-2">The first piece is on its way. Check back soon.</p>
    </div>
  );
}
