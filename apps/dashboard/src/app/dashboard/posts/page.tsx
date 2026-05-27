'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, type PostStatus } from '@/lib/api';
import { useConfirm } from '@/components/ConfirmDialog';

interface Row {
  id: string;
  slug: string;
  title: string;
  status: PostStatus;
  published_date: string | null;
  updated_at: string;
}

const STATUSES: (PostStatus | 'ALL')[] = [
  'ALL',
  'DRAFT',
  'PENDING_REVIEW',
  'SCHEDULED',
  'PUBLISHED',
  'ARCHIVED',
];

const PILL: Record<PostStatus, string> = {
  DRAFT: 'pill-draft',
  PENDING_REVIEW: 'pill-pending',
  SCHEDULED: 'pill-scheduled',
  PUBLISHED: 'pill-published',
  ARCHIVED: 'pill-archived',
};

export default function PostsPage() {
  const confirm = useConfirm();
  const [posts, setPosts] = useState<Row[]>([]);
  const [filter, setFilter] = useState<PostStatus | 'ALL'>('ALL');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const qs = filter === 'ALL' ? '' : `?status=${filter}`;
    const { data } = await api<{ data: Row[] }>(`/api/v1/admin/posts${qs}`);
    setPosts(data);
    setLoading(false);
  }
  useEffect(() => {
    load().catch(console.error);
  }, [filter]);

  async function remove(id: string) {
    const post = posts.find((p) => p.id === id);
    const ok = await confirm({
      title: 'Delete this post?',
      message: `"${post?.title || 'Untitled'}" will be permanently deleted. This cannot be undone.`,
      confirmLabel: 'Delete post',
      tone: 'danger',
    });
    if (!ok) return;
    await api(`/api/v1/admin/posts/${id}`, { method: 'DELETE' });
    load();
  }

  const filtered = query
    ? posts.filter(
        (p) =>
          p.title.toLowerCase().includes(query.toLowerCase()) ||
          p.slug.toLowerCase().includes(query.toLowerCase()),
      )
    : posts;

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Posts</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage drafts, scheduled posts, and published work.
          </p>
        </div>
        <Link href="/dashboard/posts/new" className="btn btn-primary">
          <span aria-hidden>+</span> New post
        </Link>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1.5 p-1 rounded-xl bg-slate-100/80 border border-slate-200/60">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
                filter === s
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {s.replace('_', ' ')}
            </button>
          ))}
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
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search posts…"
            className="input !pl-10"
          />
        </div>
      </div>

      <div className="card divide-y divide-slate-100 overflow-hidden stagger">
        {loading && <div className="px-5 py-10 text-sm text-slate-400 text-center">Loading…</div>}
        {!loading && filtered.length === 0 && (
          <p className="px-5 py-10 text-sm text-slate-500 text-center">Nothing here yet.</p>
        )}
        {filtered.map((p) => (
          <div
            key={p.id}
            className="group flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50/60 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <Link
                href={`/dashboard/posts/${p.id}/edit`}
                className="font-medium hover:text-indigo-600 transition-colors"
              >
                {p.title || '(untitled)'}
              </Link>
              <div className="text-xs text-slate-500 mt-0.5">
                <span className="font-mono">/{p.slug}</span>
                <span className="mx-1.5">·</span>
                <span>updated {new Date(p.updated_at).toLocaleString()}</span>
              </div>
            </div>
            <span className={`pill ${PILL[p.status]}`}>{p.status.replace('_', ' ')}</span>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {p.status === 'PUBLISHED' && (
                <Link href={`/read/${p.slug}`} className="btn btn-ghost text-xs" target="_blank">
                  View
                </Link>
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
