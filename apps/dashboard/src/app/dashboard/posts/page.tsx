'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, FileText, PenLine, Search, SquarePen, Trash2, X } from 'lucide-react';
import { api, type PostStatus } from '@/lib/api';
import { postUrl } from '@/lib/site';
import { useConfirm } from '@/components/ConfirmDialog';
import { useToast } from '@/components/Toast';
import PageHeader from '@/components/PageHeader';
import SegmentedControl, { type Segment } from '@/components/SegmentedControl';
import {
  STATUS_LABEL,
  STATUS_NAME,
  STATUS_PILL,
  errMsg,
  formatDate,
  relativeTime,
} from '@/lib/utils';

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
    <div>
      <PageHeader
        title="Posts"
        description="Drafts, scheduled posts, and everything published."
        actions={
          <Link href="/dashboard/posts/new" className="btn btn-primary">
            <PenLine /> New post
          </Link>
        }
      />

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="max-w-full overflow-x-auto">
          <SegmentedControl
            segments={SEGMENTS}
            value={filter}
            onChange={setFilter}
            label="Filter posts by status"
          />
        </div>
        <div className="ml-auto relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-tertiary pointer-events-none" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title or slug"
            aria-label="Search posts"
            className="input !pl-9 !pr-9"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 btn btn-ghost btn-icon btn-sm"
            >
              <X />
            </button>
          )}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="hidden md:grid grid-cols-[1fr_8rem_9rem_7.5rem] gap-4 px-5 h-10 items-center border-b border-line bg-surface-sunken/50 t-label">
          <span>Title</span>
          <span>Status</span>
          <span>Updated</span>
          <span className="sr-only">Actions</span>
        </div>

        {loading &&
          [0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="px-5 py-4 flex items-center gap-4 border-b border-line last:border-0"
            >
              <div className="flex-1 space-y-2">
                <div className="skeleton h-4 w-1/3" />
                <div className="skeleton h-3 w-1/5" />
              </div>
              <div className="skeleton h-5 w-20 rounded-full" />
            </div>
          ))}

        {error && !loading && (
          <div className="px-5 py-16 text-center space-y-3">
            <p className="t-body">{error}</p>
            <button onClick={load} className="btn btn-secondary">
              Try again
            </button>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="px-5 py-16 text-center">
            <span className="mx-auto grid place-items-center w-11 h-11 rounded-xl bg-surface-sunken ring-1 ring-line text-content-tertiary">
              <FileText className="w-5 h-5" />
            </span>
            <p className="t-heading mt-4">
              {query
                ? 'No matches'
                : filter === 'ALL'
                  ? 'No posts yet'
                  : `No ${STATUS_LABEL[filter].toLowerCase()}`}
            </p>
            <p className="t-secondary mt-1">
              {query ? `Nothing matches “${query}”.` : 'Posts you write will show up here.'}
            </p>
            {query ? (
              <button onClick={() => setQuery('')} className="btn btn-secondary mt-5">
                Clear search
              </button>
            ) : (
              <Link href="/dashboard/posts/new" className="btn btn-primary mt-5">
                <PenLine /> Write a post
              </Link>
            )}
          </div>
        )}

        {!loading &&
          filtered.map((p) => (
            <div
              key={p.id}
              className="group relative grid grid-cols-[1fr_auto] md:grid-cols-[1fr_8rem_9rem_7.5rem] gap-x-4 gap-y-1 px-5 py-3.5 items-center border-b border-line last:border-0 hover:bg-fill-hover"
            >
              <div className="min-w-0">
                <Link
                  href={`/dashboard/posts/${p.id}/edit`}
                  className="text-sm font-medium truncate block after:absolute after:inset-0 after:content-['']"
                >
                  {p.title || 'Untitled'}
                </Link>
                <div className="t-caption font-mono truncate mt-0.5">/{p.slug}</div>
              </div>
              <div>
                <span className={`pill ${STATUS_PILL[p.status]}`}>{STATUS_NAME[p.status]}</span>
              </div>
              <div className="hidden md:block t-caption" title={formatDate(p.updated_at)}>
                {relativeTime(p.updated_at)}
              </div>
              <div className="row-actions relative z-10 hidden md:flex items-center justify-end gap-0.5">
                {p.status === 'PUBLISHED' && (
                  <a
                    href={postUrl(p.slug)}
                    className="btn btn-ghost btn-icon btn-sm"
                    target="_blank"
                    rel="noreferrer"
                    title="View on site"
                    aria-label="View on site"
                  >
                    <ArrowUpRight />
                  </a>
                )}
                <Link
                  href={`/dashboard/posts/${p.id}/edit`}
                  className="btn btn-ghost btn-icon btn-sm"
                  title="Edit"
                  aria-label="Edit"
                >
                  <SquarePen />
                </Link>
                <button
                  onClick={() => remove(p.id)}
                  className="btn btn-danger btn-icon btn-sm"
                  title="Delete"
                  aria-label="Delete"
                >
                  <Trash2 />
                </button>
              </div>
            </div>
          ))}
      </div>
      {!loading && filtered.length > 0 && (
        <p className="t-caption mt-3 px-1">
          {filtered.length} {filtered.length === 1 ? 'post' : 'posts'}
        </p>
      )}
    </div>
  );
}
