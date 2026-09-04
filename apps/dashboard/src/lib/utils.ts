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

// UI name for each status, in one table so the tiles and the filter can't disagree.
export const STATUS_LABEL: Record<PostStatus, string> = {
  DRAFT: 'Drafts',
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
