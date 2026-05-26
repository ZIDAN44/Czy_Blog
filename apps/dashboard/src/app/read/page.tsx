import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

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

async function fetchPosts(): Promise<PostSummary[]> {
  const res = await fetch(`${API_URL}/api/v1/posts?limit=20`, { cache: 'no-store' });
  if (!res.ok) return [];
  const { data } = await res.json();
  return data;
}

export default async function ReadIndex() {
  const posts = await fetchPosts();
  const [featured, ...rest] = posts;

  return (
    <div className="space-y-12">
      <header className="space-y-2">
        <span className="text-[10px] uppercase tracking-widest text-indigo-600 font-semibold">
          The blog
        </span>
        <h1 className="text-4xl font-semibold tracking-tight">Latest writing</h1>
        <p className="text-slate-500">
          {posts.length} published {posts.length === 1 ? 'post' : 'posts'} · Quiet corner of the
          internet where ideas get the time they deserve..
        </p>
      </header>

      {posts.length === 0 && (
        <div className="card p-10 text-center">
          <p className="text-slate-500">No published posts yet.</p>
          <Link href="/dashboard" className="btn btn-primary mt-4">
            Write the first one
          </Link>
        </div>
      )}

      {featured && (
        <Link
          href={`/read/${featured.slug}`}
          className="block group rounded-2xl overflow-hidden border border-slate-200/60 bg-gradient-to-br from-slate-50 to-white hover:shadow-md transition-all"
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
            <span className="text-[10px] uppercase tracking-widest text-indigo-600 font-semibold">
              Featured
            </span>
            <h2 className="text-2xl font-semibold tracking-tight mt-2 group-hover:text-indigo-600 transition-colors">
              {featured.title}
            </h2>
            {featured.excerpt && (
              <p className="text-slate-600 mt-3 leading-relaxed">{featured.excerpt}</p>
            )}
            <p className="text-xs text-slate-400 mt-4">
              by {featured.author.name}
              {featured.published_date &&
                ` · ${new Date(featured.published_date).toLocaleDateString()}`}
            </p>
          </div>
        </Link>
      )}

      {rest.length > 0 && (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {rest.map((p) => (
            <li key={p.id}>
              <Link
                href={`/read/${p.slug}`}
                className="block group h-full p-6 rounded-2xl border border-slate-200/60 hover:border-slate-300 hover:shadow-sm transition-all"
              >
                <h2 className="text-lg font-semibold tracking-tight group-hover:text-indigo-600 transition-colors">
                  {p.title}
                </h2>
                {p.excerpt && (
                  <p className="text-slate-600 text-sm mt-2 leading-relaxed line-clamp-3">
                    {p.excerpt}
                  </p>
                )}
                <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
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
                        className="text-[10px] uppercase tracking-wider text-slate-500 bg-slate-100 rounded-full px-2 py-0.5"
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
