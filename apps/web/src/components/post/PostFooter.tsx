import AuthorAvatar from '@/components/AuthorAvatar';
import type { PostDetail } from '@/lib/posts';

// After the body: tags, then who wrote it (when they've written a bio).
export default function PostFooter({ post }: { post: PostDetail }) {
  const { tags, author } = post;
  if (tags.length === 0 && !author.bio) return null;
  return (
    <footer className="max-w-[44rem] mx-auto mt-14 pt-8 border-t border-line space-y-8">
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((t) => (
            <span key={t.slug} className="tag">
              #{t.slug}
            </span>
          ))}
        </div>
      )}
      {author.bio && (
        <div className="flex gap-4 p-5 rounded-xl bg-surface-sunken ring-1 ring-line">
          <AuthorAvatar
            name={author.name}
            url={author.avatar_url}
            size="lg"
            className="bg-surface"
          />
          <div>
            <div className="t-label">Written by</div>
            <div className="t-subheading mt-1">{author.name}</div>
            <p className="t-secondary mt-1">{author.bio}</p>
          </div>
        </div>
      )}
    </footer>
  );
}
