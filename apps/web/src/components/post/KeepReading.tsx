import Link from 'next/link';
import type { PostSummary } from '@/lib/posts';
import { formatDate } from '@/lib/utils';

export default function KeepReading({ posts }: { posts: PostSummary[] }) {
  if (posts.length === 0) return null;
  return (
    <section className="max-w-5xl mx-auto px-5 sm:px-8 mt-20">
      <div className="flex items-baseline justify-between border-b border-line pb-3">
        <h2 className="t-label">Keep reading</h2>
        <Link href="/" className="t-caption hover:text-content">
          All writing →
        </Link>
      </div>
      <ul className="grid gap-x-8 sm:grid-cols-3">
        {posts.map((p) => (
          <li key={p.id} className="border-b border-line sm:border-b-0">
            <Link href={`/${p.slug}`} className="group block py-6">
              <div className="t-caption tabular-nums">{formatDate(p.published_date)}</div>
              <h3 className="font-serif text-xl leading-snug font-medium tracking-[-0.015em] mt-2 group-hover:text-accent transition-colors text-balance">
                {p.title}
              </h3>
              {p.excerpt && <p className="t-secondary mt-2 line-clamp-2">{p.excerpt}</p>}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
