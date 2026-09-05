'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api, type PostStatus } from '@/lib/api';
import { postUrl } from '@/lib/site';
import { useConfirm } from '@/components/ConfirmDialog';
import { useToast } from '@/components/Toast';
import SegmentedControl, { type Segment } from '@/components/SegmentedControl';
import { STATUS_LABEL, STATUS_PILL, errMsg } from '@/lib/utils';

interface Row {
  id: string;
  slug: string;
  title: string;
  status: PostStatus;
  published_date: string | null;
  updated_at: string;
}

type Filter = PostStatus | 'ALL';

const SEGMENTS: Segment<Filter>[] = [
  { value: 'ALL', label: 'All' },
  ...(Object.keys(STATUS_LABEL) as PostStatus[]).map((s) => ({ value: s, label: STATUS_LABEL[s] })),
];

export default function PostsPage() {
  const confirm = useConfirm();
  const toast = useToast();
  const [posts, setPosts] = useState<Row[]>([]);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = filter === 'ALL' ? '' : `?status=${filter}`;
      const { data } = await api<{ data: Row[] }>(`/api/v1/admin/posts${qs}`);
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
    const post = posts.find((p) => p.id === id);
    const ok = await confirm({
      title: 'Delete this post?',
      message: `"${post?.title || 'Untitled'}" will be permanently deleted. This cannot be undone.`,
      confirmLabel: 'Delete post',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await api(`/api/v1/admin/posts/${id}`, { method: 'DELETE' });
      toast({ title: 'Post deleted', message: post?.title || 'Untitled', tone: 'success' });
      load();
    } catch (e) {
      toast({ title: 'Could not delete post', message: errMsg(e, ''), tone: 'error' });
    }
  }

  const filtered = (() => {
    if (!query) return posts;
    const q = query.toLowerCase();
    return posts.filter(
      (p) => p.title.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q),
    );
  })();

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="t-display">Posts</h1>
          <p className="t-secondary mt-1">Drafts, scheduled posts, and everything published.</p>
        </div>
        <Link href="/dashboard/posts/new" className="btn btn-primary">
          <span aria-hidden>+</span> New post
        </Link>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <div className="max-w-full overflow-x-auto">
          <SegmentedControl
            segments={SEGMENTS}
            value={filter}
            onChange={setFilter}
            label="Filter posts by status"
          />
        </div>
        <div className="ml-auto relative w-full sm:w-64">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-tertiary pointer-events-none"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title or slug…"
            aria-label="Search posts"
            className="input !pl-10"
          />
        </div>
      </div>

      <div className="card divide-y divide-line overflow-hidden">
        {loading &&
          [0, 1, 2, 3].map((i) => (
            <div key={i} className="px-5 py-4 flex items-center gap-4">
              <div className="flex-1 space-y-2">
                <div className="skeleton h-4 w-1/3" />
                <div className="skeleton h-3 w-2/5" />
              </div>
              <div className="skeleton h-5 w-20 rounded-full" />
            </div>
          ))}

        {error && !loading && (
          <div className="px-5 py-14 text-center space-y-3">
            <p className="t-body text-content">{error}</p>
            <button onClick={load} className="btn btn-secondary">
              Try again
            </button>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="px-5 py-14 text-center space-y-3">
            <p className="t-body text-content-secondary">
              {query
                ? `Nothing matches “${query}”.`
                : filter === 'ALL'
                  ? 'No posts yet.'
                  : 'Nothing with this status.'}
            </p>
            {query ? (
              <button onClick={() => setQuery('')} className="btn btn-secondary">
                Clear search
              </button>
            ) : (
              <Link href="/dashboard/posts/new" className="btn btn-primary">
                Write a post
              </Link>
            )}
          </div>
        )}

        {!loading &&
          filtered.map((p) => (
            <div
              key={p.id}
              className="group flex items-center gap-4 px-5 py-3.5 hover:bg-fill-hover transition-colors"
            >
              <div className="flex-1 min-w-0">
                <Link
                  href={`/dashboard/posts/${p.id}/edit`}
                  className="t-subheading hover:text-accent"
                >
                  {p.title || 'Untitled'}
                </Link>
                <div className="t-caption mt-0.5 truncate">
                  <span className="font-mono">/{p.slug}</span>
                  <span className="mx-1.5">·</span>
                  <span>updated {new Date(p.updated_at).toLocaleString()}</span>
                </div>
              </div>
              <span className={`pill ${STATUS_PILL[p.status]}`}>{p.status.replace('_', ' ')}</span>
              <div className="row-actions flex items-center gap-1">
                {p.status === 'PUBLISHED' && (
                  <a
                    href={postUrl(p.slug)}
                    className="btn btn-ghost text-xs"
                    target="_blank"
                    rel="noreferrer"
                  >
                    View
                  </a>
                )}
                <Link href={`/dashboard/posts/${p.id}/edit`} className="btn btn-ghost text-xs">
                  Edit
                </Link>
                <button onClick={() => remove(p.id)} className="btn btn-danger text-xs">
                  Delete
                </button>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
