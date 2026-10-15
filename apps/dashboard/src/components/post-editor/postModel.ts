import type { PostStatus } from '@/lib/api';
import type { ConfirmOptions } from '@/components/ConfirmDialog';

// Form shape, payload mapping and copy for the post editor. Pure: no React here.

type DocNode = { type: string; [key: string]: unknown };
export const EMPTY_DOC: { type: 'doc'; content: DocNode[] } = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
};

export interface PostData {
  id?: string;
  title: string;
  excerpt: string;
  content: object;
  coverImageUrl: string;
  status: PostStatus;
  scheduledFor: string;
  categorySlug: string;
  tagSlugs: string;
}

export const EMPTY_POST: PostData = {
  title: '',
  excerpt: '',
  content: EMPTY_DOC,
  coverImageUrl: '',
  status: 'DRAFT',
  scheduledFor: '',
  categorySlug: '',
  tagSlugs: '',
};

interface PostPayload {
  title: string;
  excerpt?: string;
  content: object;
  coverImageUrl?: string;
  categorySlug?: string;
  tagSlugs?: string[];
  status: PostStatus;
  scheduledFor?: string;
}

export function parseTagSlugs(raw: string): string[] | undefined {
  if (!raw) return undefined;
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Form → API body. Empty strings become `undefined` so the API keeps its defaults. */
export function toPayload(form: PostData, status: PostStatus): PostPayload {
  return {
    title: form.title,
    excerpt: form.excerpt || undefined,
    content: form.content,
    coverImageUrl: form.coverImageUrl || undefined,
    categorySlug: form.categorySlug || undefined,
    tagSlugs: parseTagSlugs(form.tagSlugs),
    status,
    scheduledFor:
      status === 'SCHEDULED' && form.scheduledFor
        ? new Date(form.scheduledFor).toISOString()
        : undefined,
  };
}

export function countWords(content: object): number {
  try {
    const text = JSON.stringify(content).match(/"text":"([^"]*)"/g) ?? [];
    return text.join(' ').split(/\s+/).filter(Boolean).length;
  } catch {
    return 0;
  }
}

// Only outward-facing moves confirm; a private, reversible draft save just happens
// (a dialog on every action teaches people to click through without reading).
export const CONFIRM_FOR_STATUS: Partial<Record<PostStatus, ConfirmOptions>> = {
  PENDING_REVIEW: {
    title: 'Submit for review?',
    message:
      'An editor will be notified to review and publish your post. You will not be able to edit while it is under review without resubmitting.',
    confirmLabel: 'Submit for review',
    tone: 'warning',
  },
  PUBLISHED: {
    title: 'Publish this post?',
    message: 'The post will go live immediately and be visible to all readers.',
    confirmLabel: 'Publish now',
    tone: 'success',
  },
  SCHEDULED: {
    title: 'Schedule this post?',
    message: 'The post will be automatically published at the scheduled time.',
    confirmLabel: 'Schedule post',
    tone: 'success',
  },
  ARCHIVED: {
    title: 'Archive this post?',
    message: 'The post will be hidden from readers. You can restore it later.',
    confirmLabel: 'Archive',
    tone: 'warning',
  },
};

export const DONE_MESSAGE: Record<PostStatus, string> = {
  DRAFT: 'Draft saved',
  PENDING_REVIEW: 'Sent for review',
  PUBLISHED: 'Published',
  SCHEDULED: 'Scheduled',
  ARCHIVED: 'Archived',
};
