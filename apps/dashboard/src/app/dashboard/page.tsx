'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api, currentUser, type PostStatus } from '@/lib/api';
import { STATUS_PILL, errMsg } from '@/lib/utils';

interface PostSummary {
  id: string;
  slug: string;
  title: string;
  status: PostStatus;
  published_date: string | null;
  updated_at: string;
}

// The glow behind each tile is the status colour itself, so it re-tints with
// the theme instead of staying a pastel that only works on white.
const STATUS_META: Record<PostStatus, { label: string; glow: string }> = {
  DRAFT: { label: 'Drafts', glow: 'var(--color-content-tertiary)' },
  PENDING_REVIEW: { label: 'In review', glow: 'var(--color-warning)' },
  SCHEDULED: { label: 'Scheduled', glow: 'var(--color-info-content)' },
  PUBLISHED: { label: 'Published', glow: 'var(--color-success)' },
  ARCHIVED: { label: 'Archived', glow: 'var(--color-danger)' },
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
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api<{ data: PostSummary[] }>('/api/v1/admin/posts?limit=100');
      const tally = emptyCounts();
      for (const p of data) tally[p.status]++;
      setCounts(tally);
      setAllPosts(data);
    } catch (e) {
      setError(errMsg(e, 'Could not reach the server.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const recent = (filter ? allPosts.filter((p) => p.status === filter) : allPosts).slice(0, 6);
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 5) return 'Up late';
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  })();

  return (
    <div className="space-y-10">
      <header className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="t-secondary">{greeting}</p>
          <h1 className="t-display mt-0.5">{me?.name?.split(' ')[0]}</h1>
        </div>
        <Link href="/dashboard/posts/new" className="btn btn-primary">
          <span aria-hidden>+</span> New post
        </Link>
      </header>

      {/* Counts double as filters — the control sits on the thing it changes,
          so no label is needed to explain the mapping. */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 stagger">
        {(Object.keys(counts) as PostStatus[]).map((k) => {
          const meta = STATUS_META[k];
          const active = filter === k;
          return (
            <button
              key={k}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(active ? null : k)}
              className={`group relative overflow-hidden text-left rounded-2xl p-4 transition-colors ${
                active
                  ? 'bg-inverse text-on-inverse border border-inverse shadow-[var(--shadow-raised)]'
                  : 'card hover-lift'
              }`}
            >
              {!active && (
                <div
                  className="absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-40 blur-2xl"
                  style={{ background: meta.glow }}
                  aria-hidden
                />
              )}
              <div className="relative">
                <div className={`t-label ${active ? 'text-on-inverse opacity-65' : ''}`}>
                  {meta.label}
                </div>
                <div className="mt-2 text-3xl font-semibold tracking-[-0.02em] leading-none">
                  {loading ? <span className="skeleton block h-8 w-10" aria-hidden /> : counts[k]}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="t-heading">Recent posts</h2>
            {filter && (
              <p className="t-caption mt-0.5">
                Showing {STATUS_META[filter].label.toLowerCase()} ·{' '}
                <button onClick={() => setFilter(null)} className="underline underline-offset-2">
                  show all
                </button>
              </p>
            )}
          </div>
          <Link href="/dashboard/posts" className="t-caption hover:text-content">
            All posts →
          </Link>
        </div>

        <div className="card divide-y divide-line overflow-hidden">
          {/* A failure says what happened and offers the way out of it. */}
          {error && !loading && (
            <div className="px-5 py-12 text-center space-y-3">
              <p className="t-body text-content">{error}</p>
              <button onClick={load} className="btn btn-secondary">
                Try again
              </button>
            </div>
          )}

          {loading &&
            [0, 1, 2].map((i) => (
              <div key={i} className="px-5 py-4 flex items-center gap-4">
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-4 w-1/3" />
                  <div className="skeleton h-3 w-1/5" />
                </div>
                <div className="skeleton h-5 w-20 rounded-full" />
              </div>
            ))}

          {!loading && !error && recent.length === 0 && (
            <div className="px-5 py-14 text-center">
              <p className="t-body text-content-secondary">
                {filter
                  ? `Nothing ${STATUS_META[filter].label.toLowerCase()} right now.`
                  : 'No posts yet.'}
              </p>
              <Link href="/dashboard/posts/new" className="btn btn-primary mt-4">
                Write your first post
              </Link>
            </div>
          )}

          {!loading &&
            recent.map((p) => (
              <Link
                key={p.id}
                href={`/dashboard/posts/${p.id}/edit`}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-fill-hover"
              >
                <div className="flex-1 min-w-0">
                  <div className="t-subheading truncate">{p.title || 'Untitled'}</div>
                  <div className="t-caption mt-0.5 font-mono truncate">/{p.slug}</div>
                </div>
                <span className={`pill ${STATUS_PILL[p.status]}`}>
                  {p.status.replace('_', ' ')}
                </span>
                <span className="t-caption hidden sm:inline tabular-nums">
                  {new Date(p.updated_at).toLocaleDateString()}
                </span>
              </Link>
            ))}
        </div>
      </section>
    </div>
  );
}
