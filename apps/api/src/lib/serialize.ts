import type { Post, User, Category, Tag, PostTag } from '../db.js';
import { config } from '../config.js';

type PostWithRels = Post & {
  author: Pick<User, 'id' | 'name' | 'avatarUrl' | 'bio'>;
  category: Category | null;
  tags: (PostTag & { tag: Tag })[];
};

export function serializePost(p: PostWithRels) {
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt,
    cover_image: p.coverImageUrl,
    content: p.content,
    status: p.status,
    published_date: p.publishedAt,
    scheduled_for: p.scheduledFor,
    canonical_link: `${config.publicSiteUrl}/${p.slug}`,
    view_count: p.viewCount,
    author: {
      id: p.author.id,
      name: p.author.name,
      avatar_url: p.author.avatarUrl,
      bio: p.author.bio,
    },
    category: p.category
      ? { id: p.category.id, slug: p.category.slug, name: p.category.name }
      : null,
    tags: p.tags.map((t) => ({ id: t.tag.id, slug: t.tag.slug, name: t.tag.name })),
    created_at: p.createdAt,
    updated_at: p.updatedAt,
  };
}
