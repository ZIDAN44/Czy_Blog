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

export const STATUS_PILL: Record<PostStatus, string> = {
  DRAFT: 'pill-draft',
  PENDING_REVIEW: 'pill-pending',
  SCHEDULED: 'pill-scheduled',
  PUBLISHED: 'pill-published',
  ARCHIVED: 'pill-archived',
};
