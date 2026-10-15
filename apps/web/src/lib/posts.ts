import { cache } from 'react';
import { API_URL } from './api';

// Public API reads for the reader. Every fetcher degrades instead of throwing,
// so an unreachable API never turns into a 500 page.

export interface Author {
  name: string;
  bio?: string | null;
  avatar_url?: string | null;
}

export interface PostSummary {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: unknown;
  cover_image: string | null;
  published_date: string | null;
  author: Author;
  category: { slug: string; name: string } | null;
  tags: { slug: string; name: string }[];
}

export interface PostDetail extends PostSummary {
  content: object;
  canonical_link: string;
  view_count: number;
}

/** `null` = API unreachable, distinct from "nothing published yet". */
export async function fetchPosts(
  limit = 20,
): Promise<{ posts: PostSummary[]; total: number } | null> {
  try {
    const res = await fetch(`${API_URL}/api/v1/posts?limit=${limit}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const { data, pagination } = await res.json();
    return { posts: data, total: pagination?.total ?? data.length };
  } catch {
    return null;
  }
}

// cache(): generateMetadata and the page share one request, so a view is counted once.
export const fetchPost = cache(async (slug: string): Promise<PostDetail | null> => {
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

/** A few other recent posts, for "Keep reading". */
export async function fetchMore(excludeId: string, count = 3): Promise<PostSummary[]> {
  const result = await fetchPosts(count + 1);
  return (result?.posts ?? []).filter((p) => p.id !== excludeId).slice(0, count);
}
