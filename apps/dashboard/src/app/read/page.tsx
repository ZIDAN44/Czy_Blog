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
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold">Latest posts</h1>
        <p className="text-slate-500 text-sm mt-1">{posts.length} published</p>
      </header>
      {posts.length === 0 && (
        <p className="text-slate-500">No published posts yet. Write one in the dashboard.</p>
      )}
      <ul className="divide-y">
        {posts.map((p) => (
          <li key={p.id} className="py-5">
            <Link href={`/read/${p.slug}`} className="block group">
              <h2 className="text-xl font-semibold group-hover:underline">{p.title}</h2>
              {p.excerpt && <p className="text-slate-600 mt-1">{p.excerpt}</p>}
              <p className="text-xs text-slate-400 mt-2">
                by {p.author.name}
                {p.published_date && ` · ${new Date(p.published_date).toLocaleDateString()}`}
                {p.tags.length > 0 && ` · ${p.tags.map((t) => `#${t.slug}`).join(' ')}`}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
