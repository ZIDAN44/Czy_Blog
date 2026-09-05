import Link from 'next/link';
import { API_URL } from '@/lib/api';

interface PostSummary {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_image: string | null;
  published_date: string | null;
  author: { name: string };
  tags: { slug: string; name: string }[];
}

// `null` = API unreachable (distinct from "nothing published yet"), so the page
// degrades instead of 500-ing.
async function fetchPosts(): Promise<PostSummary[] | null> {
  try {
    const res = await fetch(`${API_URL}/api/v1/posts?limit=20`, { cache: 'no-store' });
    if (!res.ok) return null;
    const { data } = await res.json();
    return data;
  } catch {
    return null;
  }
}

export default async function ReadIndex() {
  const result = await fetchPosts();
  const posts = result ?? [];
  const unreachable = result === null;
  const [featured, ...rest] = posts;

  return (
    <div className="space-y-12">
      <header className="space-y-2">
        <span className="t-label text-accent">The blog</span>
        <h1 className="t-display">Latest writing</h1>
        <p className="t-secondary">
          {unreachable
            ? 'Essays and notes on things worth thinking about.'
            : `${posts.length} published ${posts.length === 1 ? 'post' : 'posts'} · essays and notes on things worth thinking about.`}
        </p>
      </header>

      {unreachable && (
        <div className="note note-warning py-8 text-center">
          <p className="t-body">The posts could not be loaded just now.</p>
          <p className="t-caption mt-1">Refresh in a moment — nothing has been lost.</p>
        </div>
      )}

      {!unreachable && posts.length === 0 && (
        <p className="t-body text-content-secondary py-16 text-center">
          Nothing published yet. Check back soon.
        </p>
      )}

      {featured && (
        <Link
          href={`/${featured.slug}`}
          className="block group rounded-2xl overflow-hidden border border-line bg-surface hover-lift animate-slideUp"
        >
          {featured.cover_image && (
            <div className="aspect-[2/1] overflow-hidden">
              <img
                src={featured.cover_image}
                alt=""
                className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
              />
            </div>
          )}
          <div className="p-8">
            <span className="t-label text-accent">Latest</span>
            <h2 className="t-title mt-2 group-hover:text-accent transition-colors">
              {featured.title}
            </h2>
            {featured.excerpt && (
              <p className="t-body text-content-secondary mt-3">{featured.excerpt}</p>
            )}
            <p className="t-caption mt-4">
              by {featured.author.name}
              {featured.published_date &&
                ` · ${new Date(featured.published_date).toLocaleDateString()}`}
            </p>
          </div>
        </Link>
      )}

      {rest.length > 0 && (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-6 stagger">
          {rest.map((p) => (
            <li key={p.id}>
              <Link
                href={`/${p.slug}`}
                className="block group h-full p-6 rounded-2xl border border-line hover:border-line-strong hover-lift"
              >
                <h2 className="t-heading group-hover:text-accent transition-colors">{p.title}</h2>
                {p.excerpt && <p className="t-secondary mt-2 line-clamp-3">{p.excerpt}</p>}
                <div className="mt-4 flex items-center gap-2 t-caption">
                  <span>{p.author.name}</span>
                  {p.published_date && (
                    <>
                      <span>·</span>
                      <span>{new Date(p.published_date).toLocaleDateString()}</span>
                    </>
                  )}
                </div>
                {p.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {p.tags.slice(0, 4).map((t) => (
                      <span
                        key={t.slug}
                        className="text-[0.6875rem] tracking-[0.02em] text-content-secondary bg-surface-sunken rounded-full px-2 py-0.5"
                      >
                        {t.slug}
                      </span>
                    ))}
                  </div>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
