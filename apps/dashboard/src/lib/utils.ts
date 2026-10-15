import type { PostStatus } from './api';

export function errMsg(e: unknown, fallback: string): string {
  return e instanceof Error ? e.message : fallback;
}

export function initials(name: string | null | undefined): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

// UI name for each status group, in one table so tiles and filters can't disagree.
export const STATUS_LABEL: Record<PostStatus, string> = {
  DRAFT: 'Drafts',
  PENDING_REVIEW: 'In review',
  SCHEDULED: 'Scheduled',
  PUBLISHED: 'Published',
  ARCHIVED: 'Archived',
};

// Singular, for a pill on one post.
export const STATUS_NAME: Record<PostStatus, string> = {
  DRAFT: 'Draft',
  PENDING_REVIEW: 'In review',
  SCHEDULED: 'Scheduled',
  PUBLISHED: 'Published',
  ARCHIVED: 'Archived',
};

export const STATUS_PILL: Record<PostStatus, string> = {
  DRAFT: 'pill-draft',
  PENDING_REVIEW: 'pill-pending',
  SCHEDULED: 'pill-scheduled',
  PUBLISHED: 'pill-published',
  ARCHIVED: 'pill-archived',
};

const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
const STEPS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['second', 60],
  ['minute', 60],
  ['hour', 24],
  ['day', 7],
  ['week', 4.35],
  ['month', 12],
  ['year', Infinity],
];

/** "3 hours ago", "in 2 days". */
export function relativeTime(iso: string | Date): string {
  let v = (new Date(iso).getTime() - Date.now()) / 1000;
  for (const [unit, size] of STEPS) {
    if (Math.abs(v) < size) return rtf.format(Math.round(v), unit);
    v /= size;
  }
  return '';
}

export function formatDate(iso: string | Date): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
