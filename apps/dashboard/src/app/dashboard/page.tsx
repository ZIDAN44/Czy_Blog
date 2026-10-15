'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Archive,
  ArrowRight,
  ArrowUpRight,
  CalendarClock,
  CircleCheck,
  Eye,
  FilePen,
  KeyRound,
  PenLine,
  Users,
  type LucideIcon,
} from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { api, currentUser, type PostStatus } from '@/lib/api';
import { siteUrl } from '@/lib/site';
import { STATUS_LABEL, STATUS_NAME, STATUS_PILL, errMsg, relativeTime } from '@/lib/utils';

interface PostSummary {
  id: string;
  slug: string;
  title: string;
  status: PostStatus;
  published_date: string | null;
  updated_at: string;
}

const STATUS_ICON: Record<PostStatus, LucideIcon> = {
  DRAFT: FilePen,
  PENDING_REVIEW: Eye,
  SCHEDULED: CalendarClock,
  PUBLISHED: CircleCheck,
  ARCHIVED: Archive,
};

const STATUS_TINT: Record<PostStatus, string> = {
  DRAFT: 'text-content-secondary',
  PENDING_REVIEW: 'text-warning-content',
  SCHEDULED: 'text-info-content',
  PUBLISHED: 'text-success-content',
  ARCHIVED: 'text-content-tertiary',
};

const emptyCounts = (): Record<PostStatus, number> => ({
  PUBLISHED: 0,
  DRAFT: 0,
  PENDING_REVIEW: 0,
  SCHEDULED: 0,
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

  const recent = (filter ? allPosts.filter((p) => p.status === filter) : allPosts).slice(0, 7);
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 5) return 'Up late';
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  })();
  const canManageUsers = me?.role === 'SUPER_ADMIN' || me?.role === 'EDITOR';

  return (
    <div>
      <PageHeader
        eyebrow={greeting}
        title={me?.name?.split(' ')[0] ?? 'Welcome'}
        description="Here's where your writing stands today."
        actions={
          // The mobile top bar already carries "Write".
          <Link href="/dashboard/posts/new" className="btn btn-primary max-lg:hidden">
            <PenLine /> New post
          </Link>
        }
      />

      {/* Counts double as filters for the list below. */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 stagger">
        {(Object.keys(counts) as PostStatus[]).map((k) => {
          const active = filter === k;
          const Icon = STATUS_ICON[k];
          return (
            <button
              key={k}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(active ? null : k)}
              className={`text-left rounded-xl p-4 border active:!scale-[0.985] ${
                active
                  ? 'bg-inverse text-on-inverse border-inverse'
                  : 'bg-surface border-line shadow-[var(--shadow-card)] hover:border-line-strong'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-[0.8125rem] font-medium ${active ? 'opacity-75' : 'text-content-secondary'}`}
                >
                  {STATUS_LABEL[k]}
                </span>
                <Icon className={`w-4 h-4 ${active ? 'opacity-75' : STATUS_TINT[k]}`} />
              </div>
              <div className="mt-3 text-[1.75rem] font-semibold tracking-[-0.03em] leading-none tabular-nums">
                {loading ? <span className="skeleton block h-7 w-8" aria-hidden /> : counts[k]}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-10 grid gap-6 xl:grid-cols-[1fr_18rem]">
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between gap-4 px-5 h-14 border-b border-line">
            <div className="flex items-center gap-2">
              <h2 className="t-heading">{filter ? STATUS_LABEL[filter] : 'Recent activity'}</h2>
              {filter && (
                <button onClick={() => setFilter(null)} className="btn btn-ghost btn-sm">
                  Clear
                </button>
              )}
            </div>
            <Link href="/dashboard/posts" className="btn btn-ghost btn-sm">
              All posts <ArrowRight />
            </Link>
          </div>

          {error && !loading && (
            <div className="px-5 py-14 text-center space-y-3">
              <p className="t-body">{error}</p>
              <button onClick={load} className="btn btn-secondary">
                Try again
              </button>
            </div>
          )}

          {loading &&
            [0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="px-5 py-4 flex items-center gap-4 border-b border-line last:border-0"
              >
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-4 w-2/5" />
                  <div className="skeleton h-3 w-1/4" />
                </div>
                <div className="skeleton h-5 w-20 rounded-full" />
              </div>
            ))}

          {!loading && !error && recent.length === 0 && (
            <div className="px-5 py-16 text-center">
              <p className="t-body text-content-secondary">
                {filter
                  ? `Nothing ${STATUS_LABEL[filter].toLowerCase()} right now.`
                  : 'No posts yet.'}
              </p>
              <Link href="/dashboard/posts/new" className="btn btn-primary mt-4">
                <PenLine /> Write your first post
              </Link>
            </div>
          )}

          {!loading && (
            <ul>
              {recent.map((p) => (
                <li key={p.id} className="border-b border-line last:border-0">
                  <Link
                    href={`/dashboard/posts/${p.id}/edit`}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-fill-hover"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{p.title || 'Untitled'}</div>
                      <div className="t-caption mt-0.5 truncate">
                        Edited {relativeTime(p.updated_at)}
                      </div>
                    </div>
                    <span className={`pill ${STATUS_PILL[p.status]}`}>{STATUS_NAME[p.status]}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 content-start">
          <h2 className="t-label px-1 sm:col-span-2 xl:col-span-1">Shortcuts</h2>
          <Shortcut
            href="/dashboard/posts/new"
            icon={PenLine}
            title="Write a post"
            hint="Start a new draft"
          />
          {canManageUsers && (
            <Shortcut
              href="/dashboard/users"
              icon={Users}
              title="Manage people"
              hint="Roles and accounts"
            />
          )}
          <Shortcut
            href="/dashboard/api-keys"
            icon={KeyRound}
            title="API keys"
            hint="Read posts from other apps"
          />
          <Shortcut
            href={siteUrl()}
            external
            icon={ArrowUpRight}
            title="View the blog"
            hint="See it as readers do"
          />
        </aside>
      </div>
    </div>
  );
}

function Shortcut({
  href,
  icon: Icon,
  title,
  hint,
  external,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  hint: string;
  external?: boolean;
}) {
  const body = (
    <>
      <span className="grid place-items-center w-9 h-9 rounded-lg bg-surface-sunken ring-1 ring-line text-content-secondary group-hover:text-content">
        <Icon className="w-4 h-4" />
      </span>
      <span className="min-w-0 leading-tight">
        <span className="block text-sm font-medium">{title}</span>
        <span className="block t-caption mt-0.5">{hint}</span>
      </span>
    </>
  );
  const cls = 'group card flex items-center gap-3 p-3 hover:border-line-strong';
  return external ? (
    <a href={href} target="_blank" rel="noreferrer" className={cls}>
      {body}
    </a>
  ) : (
    <Link href={href} className={cls}>
      {body}
    </Link>
  );
}
