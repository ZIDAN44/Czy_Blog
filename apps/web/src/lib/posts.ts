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

// The public list endpoint caps `limit` at 50.
const SITEMAP_PAGE_SIZE = 50;
// A hard stop so a misbehaving API can't keep the sitemap paging forever.
const SITEMAP_MAX_PAGES = 200;

/**
 * Every published post's slug and dates, for the sitemap. Pages through the
 * public API (50 per request, so one call for a typical blog). Returns what it
 * has so far if a page fails.
 */
export async function fetchAllPublished(): Promise<PostSummary[]> {
  const all: PostSummary[] = [];
  for (let page = 1; page <= SITEMAP_MAX_PAGES; page++) {
    try {
      const res = await fetch(`${API_URL}/api/v1/posts?limit=${SITEMAP_PAGE_SIZE}&page=${page}`, {
        cache: 'no-store',
      });
      if (!res.ok) break;
      const { data, pagination } = await res.json();
      all.push(...data);
      if (!pagination || page >= pagination.pages) break;
    } catch {
      break;
    }
  }
  return all;
}

/** A few other recent posts, for "Keep reading". */
export async function fetchMore(excludeId: string, count = 3): Promise<PostSummary[]> {
  const result = await fetchPosts(count + 1);
  return (result?.posts ?? []).filter((p) => p.id !== excludeId).slice(0, count);
}
