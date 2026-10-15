import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import type { PostSummary } from '@/lib/posts';
import { formatDate, readingMinutes } from '@/lib/utils';

// One row of the editorial list: date, story, and a thumbnail when there is one.
export default function PostListItem({ post: p }: { post: PostSummary }) {
  return (
    <li className="border-b border-line last:border-b-0">
      <Link
        href={`/${p.slug}`}
        className="group grid grid-cols-1 sm:grid-cols-[8.5rem_1fr_auto] gap-x-8 gap-y-2 py-8 items-start"
      >
        <div className="t-caption tabular-nums sm:pt-2">{formatDate(p.published_date)}</div>
        <div className="min-w-0">
          {p.category && (
            <div className="text-xs font-medium text-accent mb-1.5">{p.category.name}</div>
          )}
          <h3 className="font-serif text-[1.5rem] sm:text-[1.625rem] leading-[1.2] font-medium tracking-[-0.018em] text-balance">
            {/* Underline draws in from the left on hover. */}
            <span className="bg-[linear-gradient(currentColor,currentColor)] bg-no-repeat bg-[length:0%_1px] bg-[position:0_100%] group-hover:bg-[length:100%_1px] transition-[background-size] duration-300">
              {p.title}
            </span>
          </h3>
          {p.excerpt && <p className="t-secondary mt-2 line-clamp-2 max-w-[60ch]">{p.excerpt}</p>}
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 t-caption">
            <span>{p.author.name}</span>
            <span aria-hidden>·</span>
            <span>{readingMinutes(p.content)} min read</span>
          </div>
        </div>
        {p.cover_image ? (
          <div className="hidden sm:block w-36 aspect-[4/3] overflow-hidden rounded-lg bg-surface-sunken ring-1 ring-line">
            <img
              src={p.cover_image}
              alt=""
              loading="lazy"
              className="zoom-img w-full h-full object-cover"
            />
          </div>
        ) : (
          <ArrowUpRight className="hidden sm:block w-5 h-5 mt-2 text-content-tertiary group-hover:text-content transition-colors" />
        )}
      </Link>
    </li>
  );
}
