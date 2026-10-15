import Link from 'next/link';
import { ArrowUpRight, Rss } from 'lucide-react';
import { API_URL } from '@/lib/api';
import { formatDate, initials, readingMinutes } from '@/lib/utils';

interface PostSummary {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: unknown;
  cover_image: string | null;
  published_date: string | null;
  author: { name: string; avatar_url?: string | null };
  category: { slug: string; name: string } | null;
  tags: { slug: string; name: string }[];
}

// `null` = API unreachable (distinct from "nothing published yet"), so the page
// degrades instead of 500-ing.
async function fetchPosts(): Promise<{ posts: PostSummary[]; total: number } | null> {
  try {
    const res = await fetch(`${API_URL}/api/v1/posts?limit=20`, { cache: 'no-store' });
    if (!res.ok) return null;
    const { data, pagination } = await res.json();
    return { posts: data, total: pagination?.total ?? data.length };
  } catch {
    return null;
  }
}

export default async function ReadIndex() {
  const result = await fetchPosts();
  const posts = result?.posts ?? [];
  const unreachable = result === null;
  const [featured, ...rest] = posts;

  return (
    <div className="max-w-5xl mx-auto px-5 sm:px-8">
      <section className="pt-14 sm:pt-20 pb-12 sm:pb-16 border-b border-line">
        <p className="t-label text-accent">Essays &amp; notes</p>
        <h1 className="t-serif-display mt-4 text-[clamp(2.375rem,1.6rem+3.4vw,4rem)] max-w-[16ch] text-balance">
          On things worth thinking about, slowly.
        </h1>
        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 t-secondary">
          {!unreachable && result.total > 0 && (
            <span>
              {result.total} {result.total === 1 ? 'piece' : 'pieces'}
              {featured?.published_date && (
                <> · last published {formatDate(featured.published_date, 'long')}</>
              )}
            </span>
          )}
          <a href="/rss.xml" className="inline-flex items-center gap-1.5 link">
            <Rss className="w-3.5 h-3.5" /> Follow via RSS
          </a>
        </div>
      </section>

      {unreachable && (
        <div className="my-16 card px-6 py-12 text-center">
          <p className="t-heading">The posts could not be loaded just now.</p>
          <p className="t-secondary mt-1.5">Refresh in a moment — nothing has been lost.</p>
        </div>
      )}

      {!unreachable && posts.length === 0 && (
        <div className="my-16 py-16 text-center">
          <p className="font-serif text-2xl">Nothing published yet.</p>
          <p className="t-secondary mt-2">The first piece is on its way. Check back soon.</p>
        </div>
      )}

      {featured && (
        <Link
          href={`/${featured.slug}`}
          className="group grid gap-6 lg:gap-10 py-12 sm:py-14 lg:grid-cols-[1.2fr_1fr] items-center border-b border-line animate-slideUp"
        >
          {featured.cover_image ? (
            <div className="aspect-[3/2] overflow-hidden rounded-xl bg-surface-sunken ring-1 ring-line">
              <img
                src={featured.cover_image}
                alt=""
                className="zoom-img w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="aspect-[3/2] rounded-xl bg-surface-sunken ring-1 ring-line bg-dots" />
          )}
          <div>
            <div className="flex items-center gap-2 t-caption">
              <span className="text-accent font-medium">Latest</span>
              {featured.category && (
                <>
                  <span aria-hidden>·</span>
                  <span>{featured.category.name}</span>
                </>
              )}
            </div>
            <h2 className="t-serif-display mt-3 text-[clamp(1.875rem,1.4rem+1.6vw,2.625rem)] text-balance group-hover:text-accent transition-colors">
              {featured.title}
            </h2>
            {featured.excerpt && (
              <p className="mt-4 text-[1.0625rem] leading-relaxed text-content-secondary text-pretty">
                {featured.excerpt}
              </p>
            )}
            <div className="mt-6 flex items-center gap-3">
              <Avatar name={featured.author.name} url={featured.author.avatar_url} />
              <div className="leading-tight">
                <div className="text-sm font-medium">{featured.author.name}</div>
                <div className="t-caption mt-0.5">
                  {formatDate(featured.published_date)} · {readingMinutes(featured.content)} min
                  read
                </div>
              </div>
            </div>
          </div>
        </Link>
      )}

      {rest.length > 0 && (
        <section className="pt-12">
          <h2 className="t-label mb-2">More writing</h2>
          <ul className="stagger">
            {rest.map((p) => (
              <li key={p.id} className="border-b border-line last:border-b-0">
                <Link
                  href={`/${p.slug}`}
                  className="group grid grid-cols-1 sm:grid-cols-[8.5rem_1fr_auto] gap-x-8 gap-y-2 py-8 items-start"
                >
                  <div className="t-caption tabular-nums sm:pt-2">
                    {formatDate(p.published_date)}
                  </div>
                  <div className="min-w-0">
                    {p.category && (
                      <div className="text-xs font-medium text-accent mb-1.5">
                        {p.category.name}
                      </div>
                    )}
                    <h3 className="font-serif text-[1.5rem] sm:text-[1.625rem] leading-[1.2] font-medium tracking-[-0.018em] text-balance">
                      <span className="bg-[linear-gradient(currentColor,currentColor)] bg-no-repeat bg-[length:0%_1px] bg-[position:0_100%] group-hover:bg-[length:100%_1px] transition-[background-size] duration-300">
                        {p.title}
                      </span>
                    </h3>
                    {p.excerpt && (
                      <p className="t-secondary mt-2 line-clamp-2 max-w-[60ch]">{p.excerpt}</p>
                    )}
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
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Avatar({ name, url }: { name: string; url?: string | null }) {
  return url ? (
    <img src={url} alt="" className="w-9 h-9 rounded-full object-cover ring-1 ring-line" />
  ) : (
    <span className="grid place-items-center w-9 h-9 rounded-full bg-surface-sunken ring-1 ring-line text-xs font-semibold text-content-secondary">
      {initials(name)}
    </span>
  );
}
