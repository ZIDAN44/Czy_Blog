'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import BlockEditor from './Editor';
import { api, currentUser, type PostStatus } from '@/lib/api';
import { errMsg } from '@/lib/utils';
import { useDraftAutosave } from '@/lib/useDraftAutosave';
import { useConfirm, type ConfirmOptions } from './ConfirmDialog';
import { useToast } from './Toast';

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

function parseTagSlugs(raw: string): string[] | undefined {
  if (!raw) return undefined;
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Only the outward-facing moves ask first. Saving a draft is private and
 * reversible, so it just happens and reports itself in a toast — a dialog on
 * every action is how people learn to click through without reading.
 */
const CONFIRM_FOR_STATUS: Partial<Record<PostStatus, ConfirmOptions>> = {
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

const DONE_MESSAGE: Record<PostStatus, string> = {
  DRAFT: 'Draft saved',
  PENDING_REVIEW: 'Sent for review',
  PUBLISHED: 'Published',
  SCHEDULED: 'Scheduled',
  ARCHIVED: 'Archived',
};

export default function PostForm({ postId, initial }: Props) {
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();
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
  const [busy, setBusy] = useState<PostStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editorKey, setEditorKey] = useState(0);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const user = currentUser();
  const role = user?.role;
  const canPublish = role && role !== 'CONTRIBUTOR';

  // Snapshot of the last server-saved state; while the form matches it there is
  // nothing unsaved, so the autosave hook stores and offers nothing.
  const savedSnapshot = useRef(JSON.stringify(form));
  const draftKey = `czy:draft:${user?.id ?? 'anon'}:${postId ?? 'new'}`;
  const { recovered, dismissRecovered, clear } = useDraftAutosave(
    draftKey,
    form,
    savedSnapshot.current,
  );
  const dirty = JSON.stringify(form) !== savedSnapshot.current;

  function set<K extends keyof PostData>(key: K, value: PostData[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function restoreDraft() {
    if (!recovered) return;
    setForm(recovered.data);
    setEditorKey((k) => k + 1);
    dismissRecovered();
    toast({ title: 'Draft restored', tone: 'success' });
  }

  async function save(status: PostStatus) {
    const opts = CONFIRM_FOR_STATUS[status];
    if (opts) {
      const message =
        status === 'SCHEDULED' && form.scheduledFor
          ? `${opts.message}\n\nScheduled for: ${new Date(form.scheduledFor).toLocaleString()}`
          : opts.message;
      const ok = await confirm({ ...opts, message });
      if (!ok) return;
    }
    setBusy(status);
    setError(null);
    try {
      const payload: PostPayload = {
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
        clear();
        toast({ title: DONE_MESSAGE[status], message: form.title, tone: 'success' });
        router.replace(`/dashboard/posts/${data.id}/edit`);
        return;
      }
      savedSnapshot.current = JSON.stringify(form);
      setSavedAt(new Date());
      clear();
      toast({ title: DONE_MESSAGE[status], message: form.title, tone: 'success' });
      router.refresh();
    } catch (e) {
      const message = errMsg(e, 'Unknown error');
      setError(message);
      toast({ title: 'Could not save', message, tone: 'error' });
    } finally {
      setBusy(null);
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
  const readingMinutes = Math.max(1, Math.round(wordCount / 225));

  const titleMissing = !form.title.trim();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        {recovered && (
          <div className="note note-warning flex flex-wrap items-center gap-3 px-4 py-3 t-body animate-slideUp">
            <span className="flex-1">
              Unsaved changes from {new Date(recovered.savedAt).toLocaleString()} are still here.
            </span>
            <button onClick={restoreDraft} className="btn btn-secondary py-1 px-3 text-xs">
              Restore them
            </button>
            <button onClick={clear} className="text-xs font-medium underline underline-offset-2">
              Discard
            </button>
          </div>
        )}

        <div className="card p-6 space-y-4">
          <input
            className="w-full text-3xl font-semibold tracking-[-0.024em] leading-tight bg-transparent outline-none placeholder:text-content-tertiary"
            placeholder="Untitled post"
            aria-label="Post title"
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
          />
          <textarea
            className="w-full t-body bg-transparent outline-none placeholder:text-content-tertiary resize-none border-l-2 border-line pl-3"
            placeholder="Add a short excerpt to grab readers (optional)"
            aria-label="Excerpt"
            rows={2}
            value={form.excerpt}
            onChange={(e) => set('excerpt', e.target.value)}
          />
        </div>

        <div className="card p-6">
          <BlockEditor
            key={editorKey}
            initialContent={form.content}
            onChange={(c) => set('content', c)}
          />
          <div className="t-caption mt-4 pt-3 border-t border-line flex items-center gap-3">
            <span className="tabular-nums">{wordCount.toLocaleString()} words</span>
            <span aria-hidden>·</span>
            <span>{readingMinutes} min read</span>
          </div>
        </div>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-20 self-start">
        <section className="card p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="t-label">Publish</h3>
            <SaveState dirty={dirty} savedAt={savedAt} busy={busy !== null} />
          </div>

          {error && <p className="note note-danger t-caption">{error}</p>}

          <div className="flex flex-wrap gap-2">
            <button
              disabled={busy !== null || titleMissing}
              onClick={() => save('DRAFT')}
              className="btn btn-secondary flex-1"
            >
              {busy === 'DRAFT' ? 'Saving…' : 'Save draft'}
            </button>
            {canPublish ? (
              <button
                disabled={busy !== null || titleMissing}
                onClick={() => save('PUBLISHED')}
                className="btn btn-primary flex-1"
              >
                {busy === 'PUBLISHED' ? 'Publishing…' : 'Publish'}
              </button>
            ) : (
              <button
                disabled={busy !== null || titleMissing}
                onClick={() => save('PENDING_REVIEW')}
                className="btn btn-warn flex-1"
              >
                {busy === 'PENDING_REVIEW' ? 'Sending…' : 'Submit for review'}
              </button>
            )}
          </div>

          {/* Say why a control is unavailable rather than leaving it dimmed
              and unexplained. */}
          {titleMissing && <p className="t-caption">Add a title to save this post.</p>}

          {canPublish && (
            <div className="space-y-2 pt-3 border-t border-line">
              <label
                className="t-caption font-medium text-content-secondary"
                htmlFor="scheduled-for"
              >
                Schedule for
              </label>
              <input
                id="scheduled-for"
                type="datetime-local"
                className="input"
                value={form.scheduledFor}
                onChange={(e) => set('scheduledFor', e.target.value)}
              />
              <button
                disabled={busy !== null || titleMissing || !form.scheduledFor}
                onClick={() => save('SCHEDULED')}
                className="btn btn-secondary w-full"
              >
                {busy === 'SCHEDULED' ? 'Scheduling…' : 'Schedule post'}
              </button>
            </div>
          )}
        </section>

        <section className="card p-5 space-y-3">
          <h3 className="t-label">Meta</h3>
          <label className="block">
            <span className="t-caption font-medium text-content-secondary">Cover image URL</span>
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
              className="rounded-lg w-full aspect-video object-cover border border-line"
            />
          )}
          <label className="block">
            <span className="t-caption font-medium text-content-secondary">Category slug</span>
            <input
              className="input mt-1"
              value={form.categorySlug}
              onChange={(e) => set('categorySlug', e.target.value)}
              placeholder="engineering"
            />
          </label>
          <label className="block">
            <span className="t-caption font-medium text-content-secondary">Tags</span>
            <input
              className="input mt-1"
              value={form.tagSlugs}
              onChange={(e) => set('tagSlugs', e.target.value)}
              placeholder="rust, async"
            />
            <span className="t-caption mt-1 inline-block">Separate with commas.</span>
          </label>
        </section>
      </aside>
    </div>
  );
}

/** Ongoing status, exposed rather than left to guesswork. */
function SaveState({
  dirty,
  savedAt,
  busy,
}: {
  dirty: boolean;
  savedAt: Date | null;
  busy: boolean;
}) {
  if (busy) return <span className="t-caption">Saving…</span>;
  if (dirty)
    return (
      <span className="t-caption inline-flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-warning" aria-hidden />
        Unsaved
      </span>
    );
  if (savedAt)
    return (
      <span className="t-caption inline-flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-success" aria-hidden />
        Saved {savedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
      </span>
    );
  return null;
}
