'use client';
import { CalendarClock, ImageIcon } from 'lucide-react';
import { parseTagSlugs } from './postModel';
import type { PostFormState } from './usePostForm';

// Settings beside the writing canvas: schedule, cover image, category and tags.
export default function PostSidebar({ state }: { state: PostFormState }) {
  const titleMissing = !state.form.title.trim();
  return (
    <aside className="space-y-4 xl:sticky xl:top-6">
      {/* Say why saving is unavailable rather than just dimming the buttons. */}
      {titleMissing && <p className="note note-info">Add a title to save this post.</p>}
      {state.canPublish && <SchedulePanel state={state} />}
      <CoverPanel state={state} />
      <OrganizePanel state={state} />
    </aside>
  );
}

function SchedulePanel({ state: { form, set, busy, save } }: { state: PostFormState }) {
  return (
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
        disabled={busy !== null || !form.title.trim() || !form.scheduledFor}
        onClick={() => save('SCHEDULED')}
        className="btn btn-secondary w-full mt-3"
      >
        {busy === 'SCHEDULED' ? 'Scheduling…' : 'Schedule post'}
      </button>
    </Panel>
  );
}

function CoverPanel({ state: { form, set } }: { state: PostFormState }) {
  return (
    <Panel title="Cover image" icon={ImageIcon}>
      {form.coverImageUrl ? (
        <img
          src={form.coverImageUrl}
          alt=""
          // Same uncropped rendering as the published post, so the preview is honest.
          className="block rounded-lg w-full h-auto max-h-80 object-contain bg-surface-sunken ring-1 ring-line mb-3"
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
  );
}

function OrganizePanel({ state: { form, set } }: { state: PostFormState }) {
  const tags = parseTagSlugs(form.tagSlugs);
  return (
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
