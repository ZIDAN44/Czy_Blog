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
  try {
    const res = await fetch(`${API_URL}/api/v1/posts/${slug}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const { data } = await res.json();
    return data;
  } catch {
    // An unreachable API should read as "not here", not as a crashed page.
    return null;
  }
}

export default async function ReadPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await fetchPost(slug);
  if (!post) notFound();

  return (
    <article className="space-y-8">
      {/* The way out is always in the same place, so nobody gets stuck here. */}
      <Link
        href="/read"
        className="inline-flex items-center gap-1.5 t-secondary hover:text-content"
      >
        ← All posts
      </Link>

      <header className="space-y-5">
        {post.category && <span className="t-label text-accent">{post.category.name}</span>}
        {/* Big text tightens: at this size the default spacing reads as gaps. */}
        <h1 className="text-[clamp(2.25rem,1.6rem+2.6vw,3.25rem)] font-semibold leading-[1.06] tracking-[-0.028em]">
          {post.title}
        </h1>
        {post.excerpt && (
          <p className="text-lg leading-[1.6] tracking-[-0.004em] text-content-secondary">
            {post.excerpt}
          </p>
        )}
        <div className="flex items-center gap-3 pt-2">
          {post.author.avatar_url ? (
            <img
              src={post.author.avatar_url}
              alt=""
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <span className="grid place-items-center w-10 h-10 rounded-full bg-accent text-on-inverse text-xs font-semibold">
              {initials(post.author.name)}
            </span>
          )}
          <div>
            <div className="t-subheading">{post.author.name}</div>
            <div className="t-caption">
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

      {/* Body copy: leading opens up as size drops, tracking stays near zero. */}
      <div className="ProseMirror max-w-none text-[1.0625rem] leading-[1.75] tracking-[0.002em]">
        <TiptapRender doc={post.content} />
      </div>

      {post.tags.length > 0 && (
        <footer className="pt-8 border-t border-line">
          <div className="flex flex-wrap gap-2">
            {post.tags.map((t) => (
              <span
                key={t.slug}
                className="t-caption bg-surface-sunken hover:bg-fill-active transition-colors rounded-full px-3 py-1"
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
