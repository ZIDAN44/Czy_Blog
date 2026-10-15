'use client';
import { useCallback, useEffect, useState } from 'react';
import { api, type PostStatus } from '@/lib/api';
import { errMsg } from '@/lib/utils';

export interface PostSummary {
  id: string;
  slug: string;
  title: string;
  status: PostStatus;
  published_date: string | null;
  updated_at: string;
}

export type StatusCounts = Record<PostStatus, number>;

// Display order of the status tiles.
const emptyCounts = (): StatusCounts => ({
  PUBLISHED: 0,
  DRAFT: 0,
  PENDING_REVIEW: 0,
  SCHEDULED: 0,
  ARCHIVED: 0,
});

/** Recent posts plus a per-status tally, from one request. */
export function useOverview() {
  const [counts, setCounts] = useState<StatusCounts>(emptyCounts);
  const [posts, setPosts] = useState<PostSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api<{ data: PostSummary[] }>('/api/v1/admin/posts?limit=100');
      const tally = emptyCounts();
      for (const p of data) tally[p.status]++;
      setCounts(tally);
      setPosts(data);
    } catch (e) {
      setError(errMsg(e, 'Could not reach the server.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { counts, posts, loading, error, reload: load };
}

export function greeting(hour = new Date().getHours()): string {
  if (hour < 5) return 'Up late';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}
