'use client';
import Link from 'next/link';
import { ArrowRight, PenLine } from 'lucide-react';
import type { PostStatus } from '@/lib/api';
import { STATUS_LABEL, STATUS_NAME, STATUS_PILL, relativeTime } from '@/lib/utils';
import { EmptyState, ListError, ListSkeleton } from '@/components/common/ListStates';
import type { PostSummary } from './useOverview';

export default function RecentActivity({
  posts,
  loading,
  error,
  filter,
  onClearFilter,
  onRetry,
}: {
  posts: PostSummary[];
  loading: boolean;
  error: string | null;
  filter: PostStatus | null;
  onClearFilter: () => void;
  onRetry: () => void;
}) {
  const recent = (filter ? posts.filter((p) => p.status === filter) : posts).slice(0, 7);
  return (
    <section className="card overflow-hidden">
      <div className="flex items-center justify-between gap-4 px-5 h-14 border-b border-line">
        <div className="flex items-center gap-2">
          <h2 className="t-heading">{filter ? STATUS_LABEL[filter] : 'Recent activity'}</h2>
          {filter && (
            <button onClick={onClearFilter} className="btn btn-ghost btn-sm">
              Clear
            </button>
          )}
        </div>
        <Link href="/dashboard/posts" className="btn btn-ghost btn-sm">
          All posts <ArrowRight />
        </Link>
      </div>

      {error && !loading && <ListError message={error} onRetry={onRetry} />}
      {loading && <ListSkeleton rows={4} />}
      {!loading && !error && recent.length === 0 && (
        <EmptyState
          title={
            filter ? `Nothing ${STATUS_LABEL[filter].toLowerCase()} right now.` : 'No posts yet.'
          }
          action={
            <Link href="/dashboard/posts/new" className="btn btn-primary">
              <PenLine /> Write your first post
            </Link>
          }
        />
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
  );
}
