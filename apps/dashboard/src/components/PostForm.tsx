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
  scheduledFor: string;
  categorySlug: string;
  tagSlugs: string;
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

  const wordCount = (() => {
    try {
      const text = JSON.stringify(form.content).match(/"text":"([^"]*)"/g) ?? [];
      return text.join(' ').split(/\s+/).filter(Boolean).length;
    } catch {
      return 0;
    }
  })();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <div className="card p-6 space-y-4">
          <input
            className="w-full text-3xl font-semibold tracking-tight bg-transparent outline-none placeholder:text-slate-300"
            placeholder="Untitled post"
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
          />
          <textarea
            className="w-full text-sm bg-transparent outline-none placeholder:text-slate-400 resize-none border-l-2 border-slate-200 pl-3"
            placeholder="Add a short excerpt to grab readers (optional)"
            rows={2}
            value={form.excerpt}
            onChange={(e) => set('excerpt', e.target.value)}
          />
        </div>
        <div className="card p-6">
          <BlockEditor initialContent={form.content} onChange={(c) => set('content', c)} />
          <div className="text-xs text-slate-400 mt-4 pt-3 border-t border-slate-100">
            {wordCount.toLocaleString()} words
          </div>
        </div>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-20 self-start">
        <section className="card p-5 space-y-3">
          <h3 className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Publish
          </h3>
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              disabled={busy || !form.title}
              onClick={() => save('DRAFT')}
              className="btn btn-secondary flex-1"
            >
              Save draft
            </button>
            {canPublish ? (
              <button
                disabled={busy || !form.title}
                onClick={() => save('PUBLISHED')}
                className="btn btn-primary flex-1"
              >
                Publish
              </button>
            ) : (
              <button
                disabled={busy || !form.title}
                onClick={() => save('PENDING_REVIEW')}
                className="btn btn-primary flex-1"
                style={{
                  background: 'linear-gradient(180deg, #f59e0b 0%, #d97706 100%)',
                }}
              >
                Submit for review
              </button>
            )}
          </div>
          {canPublish && (
            <div className="space-y-2 pt-3 border-t border-slate-100">
              <label className="text-xs font-medium text-slate-600">Schedule for</label>
              <input
                type="datetime-local"
                className="input"
                value={form.scheduledFor}
                onChange={(e) => set('scheduledFor', e.target.value)}
              />
              <button
                disabled={busy || !form.title || !form.scheduledFor}
                onClick={() => save('SCHEDULED')}
                className="btn btn-secondary w-full"
              >
                Schedule post
              </button>
            </div>
          )}
        </section>

        <section className="card p-5 space-y-3">
          <h3 className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Meta
          </h3>
          <label className="block">
            <span className="text-xs font-medium text-slate-600">Cover image URL</span>
            <input
              className="input mt-1"
              value={form.coverImageUrl}
              onChange={(e) => set('coverImageUrl', e.target.value)}
              placeholder="https://…"
            />
          </label>
          {form.coverImageUrl && (
            <img
              src={form.coverImageUrl}
              alt=""
              className="rounded-lg w-full aspect-video object-cover border border-slate-100"
            />
          )}
          <label className="block">
            <span className="text-xs font-medium text-slate-600">Category slug</span>
            <input
              className="input mt-1"
              value={form.categorySlug}
              onChange={(e) => set('categorySlug', e.target.value)}
              placeholder="engineering"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-slate-600">Tags</span>
            <input
              className="input mt-1"
              value={form.tagSlugs}
              onChange={(e) => set('tagSlugs', e.target.value)}
              placeholder="rust, async"
            />
            <span className="text-[10px] text-slate-400 mt-1 inline-block">Comma-separated.</span>
          </label>
        </section>
      </aside>
    </div>
  );
}
