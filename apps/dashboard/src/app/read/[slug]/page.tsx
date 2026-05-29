import Link from 'next/link';
import { notFound } from 'next/navigation';
import TiptapRender from '@/components/TiptapRender';
import { API_URL } from '@/lib/api';
import { initials } from '@/lib/utils';

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

export default async function ReadPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await fetchPost(slug);
  if (!post) notFound();

  return (
    <article className="space-y-8">
      <Link
        href="/read"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors"
      >
        ← All posts
      </Link>

      <header className="space-y-5">
        {post.category && (
          <span className="text-[10px] uppercase tracking-widest text-indigo-600 font-semibold">
            {post.category.name}
          </span>
        )}
        <h1 className="text-4xl sm:text-5xl font-semibold leading-[1.1] tracking-tight">
          {post.title}
        </h1>
        {post.excerpt && <p className="text-lg text-slate-600 leading-relaxed">{post.excerpt}</p>}
        <div className="flex items-center gap-3 pt-2">
          {post.author.avatar_url ? (
            <img
              src={post.author.avatar_url}
              alt=""
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <span className="grid place-items-center w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-xs font-semibold">
              {initials(post.author.name)}
            </span>
          )}
          <div className="text-sm">
            <div className="font-medium">{post.author.name}</div>
            <div className="text-xs text-slate-500">
              {post.published_date &&
                new Date(post.published_date).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              {post.view_count > 0 && ` · ${post.view_count.toLocaleString()} views`}
            </div>
          </div>
        </div>
      </header>

      {post.cover_image && (
        <img
          src={post.cover_image}
          alt=""
          className="rounded-2xl w-full aspect-video object-cover"
        />
      )}

      <div className="ProseMirror prose-zinc max-w-none text-[17px] leading-8">
        <TiptapRender doc={post.content} />
      </div>

      {post.tags.length > 0 && (
        <footer className="pt-8 border-t border-slate-200/60">
          <div className="flex flex-wrap gap-2">
            {post.tags.map((t) => (
              <span
                key={t.slug}
                className="text-xs text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors rounded-full px-3 py-1"
              >
                #{t.slug}
              </span>
            ))}
          </div>
        </footer>
      )}
    </article>
  );
}
