'use client';
import { useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, CalendarClock, ImageIcon, Send } from 'lucide-react';
import { useRouter } from 'next/navigation';
import BlockEditor from './Editor';
import { api, currentUser, type PostStatus } from '@/lib/api';
import { postUrl } from '@/lib/site';
import { STATUS_NAME, STATUS_PILL, errMsg } from '@/lib/utils';
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
  /** Published slug, for the view-on-site link. */
  slug?: string;
  initial?: Partial<PostData>;
}

function parseTagSlugs(raw: string): string[] | undefined {
  if (!raw) return undefined;
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

// Only outward-facing moves confirm; a private, reversible draft save just happens
// (a dialog on every action teaches people to click through without reading).
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

export default function PostForm({ postId, slug, initial }: Props) {
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
  const [current, setCurrent] = useState<PostStatus>(form.status);
  const user = currentUser();
  const role = user?.role;
  const canPublish = role && role !== 'CONTRIBUTOR';

  // Last server-saved snapshot; while the form matches it, nothing is unsaved.
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
      setCurrent(status);
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
  const isNew = !postId;
  const tags = parseTagSlugs(form.tagSlugs);

  return (
    <div>
      {/* Page bar: where you are, save state, and the moves that matter. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 pb-5 mb-6 border-b border-line">
        <div className="min-w-0 flex items-center gap-2">
          <Link
            href="/dashboard/posts"
            className="btn btn-ghost btn-icon -ml-2"
            aria-label="Back to posts"
            title="Back to posts"
          >
            <ArrowLeft />
          </Link>
          <h1 className="t-heading truncate">{isNew ? 'New post' : 'Edit post'}</h1>
          {!isNew && (
            <span className={`pill ${STATUS_PILL[current]} ml-1`}>{STATUS_NAME[current]}</span>
          )}
          <span className="ml-2">
            <SaveState dirty={dirty} savedAt={savedAt} busy={busy !== null} />
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {slug && current === 'PUBLISHED' && (
            <a
              href={postUrl(slug)}
              target="_blank"
              rel="noreferrer"
              className="btn btn-ghost hidden sm:inline-flex"
            >
              View <ArrowUpRight />
            </a>
          )}
          <button
            disabled={busy !== null || titleMissing}
            onClick={() => save('DRAFT')}
            className="btn btn-secondary"
          >
            {busy === 'DRAFT' ? 'Saving…' : 'Save draft'}
          </button>
          {canPublish ? (
            <button
              disabled={busy !== null || titleMissing}
              onClick={() => save('PUBLISHED')}
              className="btn btn-primary"
            >
              <Send />
              {busy === 'PUBLISHED'
                ? 'Publishing…'
                : current === 'PUBLISHED'
                  ? 'Update'
                  : 'Publish'}
            </button>
          ) : (
            <button
              disabled={busy !== null || titleMissing}
              onClick={() => save('PENDING_REVIEW')}
              className="btn btn-primary"
            >
              <Send /> {busy === 'PENDING_REVIEW' ? 'Sending…' : 'Submit for review'}
            </button>
          )}
        </div>
      </div>

      {recovered && (
        <div className="note note-warning flex flex-wrap items-center gap-3 mb-6 animate-slideUp">
          <span className="flex-1">
            Unsaved changes from {new Date(recovered.savedAt).toLocaleString()} are still here.
          </span>
          <button onClick={restoreDraft} className="btn btn-secondary btn-sm">
            Restore
          </button>
          <button onClick={clear} className="btn btn-ghost btn-sm">
            Discard
          </button>
        </div>
      )}
      {error && <p className="note note-danger mb-6">{error}</p>}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_19rem] gap-6 items-start">
        <div className="card">
          <div className="px-4 sm:px-6 pt-8 pb-5">
            <AutoTextarea
              className="w-full t-serif-display text-[clamp(1.875rem,1.5rem+1.4vw,2.5rem)] bg-transparent outline-none resize-none placeholder:text-content-tertiary/60"
              placeholder="Post title"
              aria-label="Post title"
              value={form.title}
              onChange={(v) => set('title', v)}
            />
            <AutoTextarea
              className="w-full mt-3 text-[1.0625rem] leading-relaxed text-content-secondary bg-transparent outline-none resize-none placeholder:text-content-tertiary/60"
              placeholder="Add a short excerpt. It shows on the homepage and in link previews."
              aria-label="Excerpt"
              value={form.excerpt}
              onChange={(v) => set('excerpt', v)}
            />
          </div>
          <BlockEditor
            key={editorKey}
            initialContent={form.content}
            onChange={(c) => set('content', c)}
          />
          <div className="flex items-center gap-3 px-4 sm:px-6 h-11 border-t border-line t-caption">
            <span className="tabular-nums">{wordCount.toLocaleString()} words</span>
            <span aria-hidden>·</span>
            <span>{readingMinutes} min read</span>
            <span className="ml-auto hidden sm:inline">Markdown paste supported</span>
          </div>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-6">
          {/* Say why saving is unavailable rather than just dimming the buttons. */}
          {titleMissing && <p className="note note-info">Add a title to save this post.</p>}

          {canPublish && (
            <Panel title="Schedule" icon={CalendarClock}>
              <label className="block" htmlFor="scheduled-for">
                <span className="field-label">Publish on</span>
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
                className="btn btn-secondary w-full mt-3"
              >
                {busy === 'SCHEDULED' ? 'Scheduling…' : 'Schedule post'}
              </button>
            </Panel>
          )}

          <Panel title="Cover image" icon={ImageIcon}>
            {form.coverImageUrl ? (
              <img
                src={form.coverImageUrl}
                alt=""
                className="rounded-lg w-full aspect-[16/9] object-cover ring-1 ring-line mb-3"
              />
            ) : (
              <div className="rounded-lg w-full aspect-[16/9] bg-surface-sunken ring-1 ring-line bg-dots mb-3 grid place-items-center t-caption">
                No cover yet
              </div>
            )}
            <input
              className="input"
              value={form.coverImageUrl}
              onChange={(e) => set('coverImageUrl', e.target.value)}
              placeholder="https://…"
              aria-label="Cover image URL"
            />
          </Panel>

          <Panel title="Organize">
            <label className="block">
              <span className="field-label">Category</span>
              <input
                className="input"
                value={form.categorySlug}
                onChange={(e) => set('categorySlug', e.target.value)}
                placeholder="engineering"
              />
            </label>
            <label className="block mt-4">
              <span className="field-label">Tags</span>
              <input
                className="input"
                value={form.tagSlugs}
                onChange={(e) => set('tagSlugs', e.target.value)}
                placeholder="rust, async"
              />
              <span className="field-hint">Separate with commas.</span>
            </label>
            {tags && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {tags.map((t) => (
                  <span key={t} className="tag">
                    #{t}
                  </span>
                ))}
              </div>
            )}
          </Panel>
        </aside>
      </div>
    </div>
  );
}

function Panel({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section className="card p-4">
      <h3 className="flex items-center gap-2 text-[0.8125rem] font-semibold mb-3">
        {Icon && <Icon className="w-4 h-4 text-content-tertiary" />}
        {title}
      </h3>
      {children}
    </section>
  );
}

// Grows with its content, so long titles wrap instead of scrolling sideways.
function AutoTextarea({
  value,
  onChange,
  className,
  ...rest
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  placeholder?: string;
  'aria-label'?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\n/g, ' '))}
      className={`block overflow-hidden ${className ?? ''}`}
      {...rest}
    />
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
  if (busy) return <span className="t-caption whitespace-nowrap">Saving…</span>;
  if (dirty)
    return (
      <span className="t-caption inline-flex items-center gap-1.5 whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-warning" aria-hidden />
        Unsaved
      </span>
    );
  if (savedAt)
    return (
      <span className="t-caption inline-flex items-center gap-1.5 whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-success" aria-hidden />
        Saved {savedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
      </span>
    );
  return null;
}
