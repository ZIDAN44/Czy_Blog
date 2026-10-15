'use client';
import { useCallback, useEffect, useState } from 'react';
import { api, type PostStatus } from '@/lib/api';
import { errMsg } from '@/lib/utils';
import { useConfirm } from '@/components/ConfirmDialog';
import { useToast } from '@/components/toast';

export interface PostRow {
  id: string;
  slug: string;
  title: string;
  status: PostStatus;
  published_date: string | null;
  updated_at: string;
}

export type StatusFilter = PostStatus | 'ALL';

/** Admin post list for one status filter, plus deletion. */
export function usePosts(filter: StatusFilter) {
  const confirm = useConfirm();
  const toast = useToast();
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = filter === 'ALL' ? '' : `?status=${filter}`;
      const { data } = await api<{ data: PostRow[] }>(`/api/v1/admin/posts${qs}`);
      setPosts(data);
    } catch (e) {
      setError(errMsg(e, 'Could not reach the server.'));
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  async function remove(id: string) {
    const title = posts.find((p) => p.id === id)?.title || 'Untitled';
    const ok = await confirm({
      title: 'Delete this post?',
      message: `"${title}" will be permanently deleted. This cannot be undone.`,
      confirmLabel: 'Delete post',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await api(`/api/v1/admin/posts/${id}`, { method: 'DELETE' });
      toast({ title: 'Post deleted', message: title, tone: 'success' });
      load();
    } catch (e) {
      toast({ title: 'Could not delete post', message: errMsg(e, ''), tone: 'error' });
    }
  }

  return { posts, loading, error, reload: load, remove };
}

/** Client-side title/slug search over the loaded page. */
export function searchPosts(posts: PostRow[], query: string): PostRow[] {
  if (!query) return posts;
  const q = query.toLowerCase();
  return posts.filter((p) => p.title.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q));
}
