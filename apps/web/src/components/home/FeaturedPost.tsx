import Link from 'next/link';
import AuthorAvatar from '@/components/AuthorAvatar';
import type { PostSummary } from '@/lib/posts';
import { formatDate, readingMinutes } from '@/lib/utils';

// The newest post, given the full width: cover on the left, story on the right.
export default function FeaturedPost({ post }: { post: PostSummary }) {
  return (
    <Link
      href={`/${post.slug}`}
      className="group grid gap-6 lg:gap-10 py-12 sm:py-14 lg:grid-cols-[1.2fr_1fr] items-center border-b border-line animate-slideUp"
    >
      {post.cover_image ? (
        // Whole cover at its own ratio (no crop); tall ones are capped and letterboxed.
        <div className="overflow-hidden rounded-xl bg-surface-sunken ring-1 ring-line">
          <img
            src={post.cover_image}
            alt=""
            className="zoom-img block w-full h-auto max-h-[28rem] object-contain"
          />
        </div>
      ) : (
        <div className="aspect-[3/2] rounded-xl bg-surface-sunken ring-1 ring-line bg-dots" />
      )}
      <div>
        <div className="flex items-center gap-2 t-caption">
          <span className="text-accent font-medium">Latest</span>
          {post.category && (
            <>
              <span aria-hidden>·</span>
              <span>{post.category.name}</span>
            </>
          )}
        </div>
        <h2 className="t-serif-display mt-3 text-[clamp(1.875rem,1.4rem+1.6vw,2.625rem)] text-balance group-hover:text-accent transition-colors">
          {post.title}
        </h2>
        {post.excerpt && (
          <p className="mt-4 text-[1.0625rem] leading-relaxed text-content-secondary text-pretty">
            {post.excerpt}
          </p>
        )}
        <div className="mt-6 flex items-center gap-3">
          <AuthorAvatar name={post.author.name} url={post.author.avatar_url} />
          <div className="leading-tight">
            <div className="text-sm font-medium">{post.author.name}</div>
            <div className="t-caption mt-0.5">
              {formatDate(post.published_date)} · {readingMinutes(post.content)} min read
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
