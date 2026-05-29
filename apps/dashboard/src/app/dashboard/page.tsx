'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, currentUser, type PostStatus } from '@/lib/api';
import { STATUS_PILL } from '@/lib/utils';

interface PostSummary {
  id: string;
  slug: string;
  title: string;
  status: PostStatus;
  published_date: string | null;
  updated_at: string;
}

const STATUS_META: Record<PostStatus, { label: string; ring: string }> = {
  DRAFT: { label: 'Drafts', ring: 'from-slate-200 to-slate-100' },
  PENDING_REVIEW: { label: 'In review', ring: 'from-amber-200 to-amber-100' },
  SCHEDULED: { label: 'Scheduled', ring: 'from-sky-200 to-sky-100' },
  PUBLISHED: { label: 'Published', ring: 'from-emerald-200 to-emerald-100' },
  ARCHIVED: { label: 'Archived', ring: 'from-rose-200 to-rose-100' },
};

const emptyCounts = (): Record<PostStatus, number> => ({
  DRAFT: 0,
  PENDING_REVIEW: 0,
  SCHEDULED: 0,
  PUBLISHED: 0,
  ARCHIVED: 0,
});

export default function Overview() {
  const me = currentUser();
  const [counts, setCounts] = useState<Record<PostStatus, number>>(emptyCounts);
  const [allPosts, setAllPosts] = useState<PostSummary[]>([]);
  const [filter, setFilter] = useState<PostStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await api<{ data: PostSummary[] }>('/api/v1/admin/posts?limit=100');
      const tally = emptyCounts();
      for (const p of data) tally[p.status]++;
      setCounts(tally);
      setAllPosts(data);
      setLoading(false);
    })().catch(console.error);
  }, []);

  const recent = (filter ? allPosts.filter((p) => p.status === filter) : allPosts).slice(0, 6);
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 5) return 'Up Late';
    if (h < 12) return 'Good Morning';
    if (h < 18) return 'Good Afternoon';
    return 'Good Evening';
  })();

  return (
    <div className="space-y-10">
      <header className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="text-sm text-slate-500">{greeting}!</p>
          <h1 className="text-3xl font-semibold tracking-tight">{me?.name?.split(' ')[0]}</h1>
        </div>
        <Link href="/dashboard/posts/new" className="btn btn-primary">
          <span aria-hidden>+</span> New post
        </Link>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 stagger">
        {(Object.keys(counts) as PostStatus[]).map((k) => {
          const meta = STATUS_META[k];
          const active = filter === k;
          return (
            <button
              key={k}
              type="button"
              onClick={() => setFilter(active ? null : k)}
              className={`group relative overflow-hidden text-left rounded-2xl p-4 transition-all ${
                active
                  ? 'bg-slate-900 text-white border border-slate-900 shadow-lg'
                  : 'card hover:-translate-y-0.5 hover:shadow-md'
              }`}
            >
              {!active && (
                <div
                  className={`absolute -top-8 -right-8 w-24 h-24 rounded-full bg-gradient-to-br ${meta.ring} opacity-60 blur-2xl`}
                  aria-hidden
                />
              )}
              <div className="relative">
                <div
                  className={`text-[10px] uppercase tracking-widest font-semibold ${
                    active ? 'text-slate-300' : 'text-slate-500'
                  }`}
                >
                  {meta.label}
                </div>
                <div className="text-3xl font-semibold mt-2 tracking-tight">
                  {loading ? <span className="text-slate-300">—</span> : counts[k]}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Recent posts</h2>
            {filter && (
              <p className="text-xs text-slate-500 mt-0.5">
                Filtered to {STATUS_META[filter].label.toLowerCase()} —{' '}
                <button onClick={() => setFilter(null)} className="underline">
                  clear
                </button>
              </p>
            )}
          </div>
          <Link href="/dashboard/posts" className="text-xs text-slate-500 hover:text-slate-900">
            View all →
          </Link>
        </div>
        <div className="card divide-y divide-slate-100 overflow-hidden stagger">
          {loading && <div className="px-5 py-10 text-sm text-slate-400 text-center">Loading…</div>}
          {!loading && recent.length === 0 && (
            <div className="px-5 py-12 text-center">
              <p className="text-sm text-slate-500">No posts here yet.</p>
              <Link href="/dashboard/posts/new" className="btn btn-primary mt-4">
                Write your first post
              </Link>
            </div>
          )}
          {recent.map((p) => (
            <Link
              key={p.id}
              href={`/dashboard/posts/${p.id}/edit`}
              className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50/60 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{p.title || '(untitled)'}</div>
                <div className="text-xs text-slate-500 mt-0.5 font-mono">/{p.slug}</div>
              </div>
              <span className={`pill ${STATUS_PILL[p.status]}`}>{p.status.replace('_', ' ')}</span>
              <span className="text-xs text-slate-400 hidden sm:inline">
                {new Date(p.updated_at).toLocaleDateString()}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
