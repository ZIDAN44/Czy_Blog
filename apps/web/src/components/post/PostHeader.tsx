import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import AuthorAvatar from '@/components/AuthorAvatar';
import type { PostDetail } from '@/lib/posts';
import { formatDate, readingMinutes } from '@/lib/utils';

export default function PostHeader({ post }: { post: PostDetail }) {
  return (
    <header className="max-w-[44rem] mx-auto pt-10 sm:pt-16">
      {/* The way out is always in the same place, so nobody gets stuck here. */}
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
        <span>{readingMinutes(post.content)} min read</span>
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
        <AuthorAvatar name={post.author.name} url={post.author.avatar_url} size="md" />
        <div className="leading-tight">
          <div className="text-sm font-medium">{post.author.name}</div>
          <div className="t-caption mt-0.5">{readsLabel(post.view_count)}</div>
        </div>
      </div>
    </header>
  );
}

function readsLabel(views: number): string {
  if (views <= 0) return 'Author';
  return `${views.toLocaleString()} ${views === 1 ? 'read' : 'reads'}`;
}
