'use client';
import Link from 'next/link';
import { ArrowUpRight, SquarePen, Trash2 } from 'lucide-react';
import { postUrl } from '@/lib/site';
import { STATUS_NAME, STATUS_PILL, formatDate, relativeTime } from '@/lib/utils';
import type { PostRow } from './usePosts';

export const POST_COLUMNS = 'md:grid-cols-[1fr_8rem_9rem_7.5rem]';

// One table row. The title link stretches over the whole row; actions sit above it.
export default function PostRowItem({
  post: p,
  onDelete,
}: {
  post: PostRow;
  onDelete: () => void;
}) {
  const editHref = `/dashboard/posts/${p.id}/edit`;
  return (
    <div
      className={`group relative grid grid-cols-[1fr_auto] ${POST_COLUMNS} gap-x-4 gap-y-1 px-5 py-3.5 items-center border-b border-line last:border-0 hover:bg-fill-hover`}
    >
      <div className="min-w-0">
        <Link
          href={editHref}
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
          href={editHref}
          className="btn btn-ghost btn-icon btn-sm"
          title="Edit"
          aria-label="Edit"
        >
          <SquarePen />
        </Link>
        <button
          onClick={onDelete}
          className="btn btn-danger btn-icon btn-sm"
          title="Delete"
          aria-label="Delete"
        >
          <Trash2 />
        </button>
      </div>
    </div>
  );
}
