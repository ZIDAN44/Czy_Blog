import Link from 'next/link';
import { notFound } from 'next/navigation';
import TiptapRender from '@/components/TiptapRender';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

interface PostDetail {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: object;
  cover_image: string | null;
  published_date: string | null;
  canonical_link: string;
  view_count: number;
  author: { name: string; bio: string | null; avatar_url: string | null };
  category: { slug: string; name: string } | null;
  tags: { slug: string; name: string }[];
}

async function fetchPost(slug: string): Promise<PostDetail | null> {
  const res = await fetch(`${API_URL}/api/v1/posts/${slug}`, { cache: 'no-store' });
  if (!res.ok) return null;
  const { data } = await res.json();
  return data;
}

// Next.js 16: dynamic route params are async — must be awaited before use.
export default async function ReadPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await fetchPost(slug);
  if (!post) notFound();

  return (
    <article className="space-y-6">
      <Link href="/read" className="text-sm text-slate-500 hover:underline">
        ← All posts
      </Link>
      <header className="space-y-3">
        <h1 className="text-4xl font-bold leading-tight">{post.title}</h1>
        <p className="text-sm text-slate-500">
          by {post.author.name}
          {post.published_date && ` · ${new Date(post.published_date).toLocaleDateString()}`}
          {post.category && ` · ${post.category.name}`}
        </p>
        {post.excerpt && <p className="text-lg text-slate-600 italic">{post.excerpt}</p>}
        {post.cover_image && <img src={post.cover_image} alt="" className="rounded-xl w-full" />}
      </header>
      <div className="ProseMirror">
        <TiptapRender doc={post.content} />
      </div>
      {post.tags.length > 0 && (
        <footer className="pt-6 border-t text-xs text-slate-500">
          Tagged: {post.tags.map((t) => `#${t.slug}`).join(' ')}
        </footer>
      )}
    </article>
  );
}
