'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import BlockEditor from './Editor';
import { api, currentUser, type PostStatus } from '@/lib/api';
import { useConfirm, type ConfirmOptions } from './ConfirmDialog';

type DocNode = { type: string; [key: string]: unknown };
type EmptyDoc = { type: 'doc'; content: DocNode[] };
const EMPTY: EmptyDoc = { type: 'doc', content: [{ type: 'paragraph' }] };

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

interface PostData {
  id?: string;
  title: string;
  excerpt: string;
  content: object;
  coverImageUrl: string;
  status: PostStatus;
  scheduledFor: string; // datetime-local value
  categorySlug: string;
  tagSlugs: string; // comma list
}

interface Props {
  postId?: string;
  initial?: Partial<PostData>;
}

const CONFIRM_FOR_STATUS: Record<PostStatus, ConfirmOptions> = {
  DRAFT: {
    title: 'Save as draft?',
    message: 'The post will be saved privately. It will not be visible to readers.',
    confirmLabel: 'Save draft',
    tone: 'default',
  },
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

export default function PostForm({ postId, initial }: Props) {
  const router = useRouter();
  const confirm = useConfirm();
  const [form, setForm] = useState<PostData>({
    title: '',
    excerpt: '',
    content: EMPTY,
    coverImageUrl: '',
    status: 'DRAFT',
    scheduledFor: '',
    categorySlug: '',
    tagSlugs: '',
    ...initial,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const role = currentUser()?.role;
  const canPublish = role && role !== 'CONTRIBUTOR';

  function set<K extends keyof PostData>(key: K, value: PostData[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save(status: PostStatus) {
    const opts = CONFIRM_FOR_STATUS[status];
    const message =
      status === 'SCHEDULED' && form.scheduledFor
        ? `${opts.message}\n\nScheduled for: ${new Date(form.scheduledFor).toLocaleString()}`
        : opts.message;
    const ok = await confirm({ ...opts, message });
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      const payload: PostPayload = {
        title: form.title,
        excerpt: form.excerpt || undefined,
        content: form.content,
        coverImageUrl: form.coverImageUrl || undefined,
        categorySlug: form.categorySlug || undefined,
        tagSlugs: form.tagSlugs
          ? form.tagSlugs
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : undefined,
        status,
        scheduledFor:
          status === 'SCHEDULED' && form.scheduledFor
            ? new Date(form.scheduledFor).toISOString()
            : undefined,
      };
      if (postId) {
        await api(`/api/v1/admin/posts/${postId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        const { data } = await api<{ data: { id: string } }>('/api/v1/admin/posts', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        router.replace(`/dashboard/posts/${data.id}/edit`);
        return;
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <input
          className="w-full text-3xl font-bold bg-transparent outline-none placeholder:text-slate-300"
          placeholder="Post title"
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
        />
        <textarea
          className="w-full border rounded-lg p-3 text-sm"
          placeholder="Short excerpt (optional)"
          rows={2}
          value={form.excerpt}
          onChange={(e) => set('excerpt', e.target.value)}
        />
        <BlockEditor initialContent={form.content} onChange={(c) => set('content', c)} />
      </div>

      <aside className="space-y-4">
        <section className="bg-white border rounded-xl p-4 space-y-3">
          <h3 className="font-semibold text-sm uppercase text-slate-500">Publish</h3>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex flex-wrap gap-2">
            <button
              disabled={busy || !form.title}
              onClick={() => save('DRAFT')}
              className="px-3 py-1.5 rounded-lg border bg-white text-sm"
            >
              Save draft
            </button>
            {canPublish ? (
              <button
                disabled={busy || !form.title}
                onClick={() => save('PUBLISHED')}
                className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-sm"
              >
                Publish
              </button>
            ) : (
              <button
                disabled={busy || !form.title}
                onClick={() => save('PENDING_REVIEW')}
                className="px-3 py-1.5 rounded-lg bg-amber-500 text-white text-sm"
              >
                Submit for review
              </button>
            )}
          </div>
          {canPublish && (
            <div className="space-y-1.5 pt-2 border-t">
              <label className="text-sm text-slate-500">Schedule for</label>
              <input
                type="datetime-local"
                className="w-full border rounded-lg px-2 py-1.5 text-sm"
                value={form.scheduledFor}
                onChange={(e) => set('scheduledFor', e.target.value)}
              />
              <button
                disabled={busy || !form.title || !form.scheduledFor}
                onClick={() => save('SCHEDULED')}
                className="w-full px-3 py-1.5 rounded-lg border text-sm"
              >
                Schedule
              </button>
            </div>
          )}
        </section>

        <section className="bg-white border rounded-xl p-4 space-y-2">
          <h3 className="font-semibold text-sm uppercase text-slate-500">Meta</h3>
          <label className="block text-sm">
            Cover image URL
            <input
              className="mt-1 w-full border rounded-lg px-2 py-1.5"
              value={form.coverImageUrl}
              onChange={(e) => set('coverImageUrl', e.target.value)}
            />
          </label>
          <label className="block text-sm">
            Category slug
            <input
              className="mt-1 w-full border rounded-lg px-2 py-1.5"
              value={form.categorySlug}
              onChange={(e) => set('categorySlug', e.target.value)}
              placeholder="engineering"
            />
          </label>
          <label className="block text-sm">
            Tags (comma-separated)
            <input
              className="mt-1 w-full border rounded-lg px-2 py-1.5"
              value={form.tagSlugs}
              onChange={(e) => set('tagSlugs', e.target.value)}
              placeholder="rust, async"
            />
          </label>
        </section>
      </aside>
    </div>
  );
}
