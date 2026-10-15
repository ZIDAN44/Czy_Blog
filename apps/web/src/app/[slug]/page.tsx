import { cache } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import ReadingProgress from '@/components/ReadingProgress';
import TiptapRender from '@/components/TiptapRender';
import { API_URL } from '@/lib/api';
import { formatDate, initials, readingMinutes } from '@/lib/utils';

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

interface PostSummary {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: unknown;
  published_date: string | null;
}

// cache(): metadata and page share one request, so a view is counted once.
const fetchPost = cache(async (slug: string): Promise<PostDetail | null> => {
  try {
    // Encode the raw slug as one segment, or a `../../health` would walk to a different API path.
    const res = await fetch(`${API_URL}/api/v1/posts/${encodeURIComponent(slug)}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const { data } = await res.json();
    return data;
  } catch {
    // An unreachable API should read as "not here", not as a crashed page.
    return null;
  }
});

async function fetchMore(excludeId: string): Promise<PostSummary[]> {
  try {
    const res = await fetch(`${API_URL}/api/v1/posts?limit=4`, { cache: 'no-store' });
    if (!res.ok) return [];
    const { data } = (await res.json()) as { data: PostSummary[] };
    return data.filter((p) => p.id !== excludeId).slice(0, 3);
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const post = await fetchPost((await params).slug);
  if (!post) return { title: 'Not found' };
  return {
    title: post.title,
    description: post.excerpt ?? undefined,
    openGraph: { title: post.title, images: post.cover_image ? [post.cover_image] : undefined },
  };
}

export default async function ReadPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await fetchPost(slug);
  if (!post) notFound();
  const more = await fetchMore(post.id);
  const minutes = readingMinutes(post.content);

  return (
    <>
      <ReadingProgress />
      <article className="px-5 sm:px-8">
        <header className="max-w-[44rem] mx-auto pt-10 sm:pt-16">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 t-secondary hover:text-content group"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
            All writing
          </Link>

          <div className="mt-10 flex items-center gap-2 t-caption">
            {post.category && (
              <>
                <span className="text-accent font-medium">{post.category.name}</span>
                <span aria-hidden>·</span>
              </>
            )}
            <time dateTime={post.published_date ?? undefined}>
              {formatDate(post.published_date, 'long')}
            </time>
            <span aria-hidden>·</span>
            <span>{minutes} min read</span>
          </div>

          <h1 className="t-serif-display mt-4 text-[clamp(2.25rem,1.5rem+3vw,3.5rem)] text-balance">
            {post.title}
          </h1>
          {post.excerpt && (
            <p className="mt-5 text-[1.1875rem] leading-[1.55] text-content-secondary text-pretty">
              {post.excerpt}
            </p>
          )}

          <div className="mt-8 flex items-center gap-3 pb-8 border-b border-line">
            {post.author.avatar_url ? (
              <img
                src={post.author.avatar_url}
                alt=""
                className="w-10 h-10 rounded-full object-cover ring-1 ring-line"
              />
            ) : (
              <span className="grid place-items-center w-10 h-10 rounded-full bg-surface-sunken ring-1 ring-line text-xs font-semibold text-content-secondary">
                {initials(post.author.name)}
              </span>
            )}
            <div className="leading-tight">
              <div className="text-sm font-medium">{post.author.name}</div>
              <div className="t-caption mt-0.5">
                {post.view_count > 0
                  ? `${post.view_count.toLocaleString()} ${post.view_count === 1 ? 'read' : 'reads'}`
                  : 'Author'}
              </div>
            </div>
          </div>
        </header>

        {post.cover_image && (
          <figure className="max-w-5xl mx-auto mt-10">
            <img
              src={post.cover_image}
              alt=""
              className="w-full aspect-[16/9] object-cover rounded-xl ring-1 ring-line"
            />
          </figure>
        )}

        <div className="ProseMirror max-w-[44rem] mx-auto mt-10">
          <TiptapRender doc={post.content} />
        </div>

        <footer className="max-w-[44rem] mx-auto mt-14 pt-8 border-t border-line space-y-8">
          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {post.tags.map((t) => (
                <span key={t.slug} className="tag">
                  #{t.slug}
                </span>
              ))}
            </div>
          )}
          {post.author.bio && (
            <div className="flex gap-4 p-5 rounded-xl bg-surface-sunken ring-1 ring-line">
              <span className="grid place-items-center w-11 h-11 shrink-0 rounded-full bg-surface ring-1 ring-line text-xs font-semibold text-content-secondary">
                {initials(post.author.name)}
              </span>
              <div>
                <div className="t-label">Written by</div>
                <div className="t-subheading mt-1">{post.author.name}</div>
                <p className="t-secondary mt-1">{post.author.bio}</p>
              </div>
            </div>
          )}
        </footer>
      </article>

      {more.length > 0 && (
        <section className="max-w-5xl mx-auto px-5 sm:px-8 mt-20">
          <div className="flex items-baseline justify-between border-b border-line pb-3">
            <h2 className="t-label">Keep reading</h2>
            <Link href="/" className="t-caption hover:text-content">
              All writing →
            </Link>
          </div>
          <ul className="grid gap-x-8 sm:grid-cols-3">
            {more.map((p) => (
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
      )}
    </>
  );
}
