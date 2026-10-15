'use client';
import { Archive, CalendarClock, CircleCheck, Eye, FilePen, type LucideIcon } from 'lucide-react';
import type { PostStatus } from '@/lib/api';
import { STATUS_LABEL } from '@/lib/utils';
import type { StatusCounts } from './useOverview';

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

// Counts double as filters for the list below; pressing the active tile clears it.
export default function StatusTiles({
  counts,
  loading,
  filter,
  onFilter,
}: {
  counts: StatusCounts;
  loading: boolean;
  filter: PostStatus | null;
  onFilter: (status: PostStatus | null) => void;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 stagger">
      {(Object.keys(counts) as PostStatus[]).map((k) => {
        const active = filter === k;
        const Icon = STATUS_ICON[k];
        return (
          <button
            key={k}
            type="button"
            aria-pressed={active}
            onClick={() => onFilter(active ? null : k)}
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
  );
}
