'use client';
import BlockEditor from '@/components/editor/BlockEditor';
import AutoTextarea from './AutoTextarea';
import PostActionBar from './PostActionBar';
import PostSidebar from './PostSidebar';
import { countWords, type PostData } from './postModel';
import { usePostForm, type PostFormState } from './usePostForm';

interface Props {
  postId?: string;
  /** Published slug, for the view-on-site link. */
  slug?: string;
  initial?: Partial<PostData>;
}

// The post editor page: action bar, writing canvas, settings sidebar.
// State and saving live in usePostForm; this file only arranges the pieces.
export default function PostForm({ postId, slug, initial }: Props) {
  const state = usePostForm(postId, initial);
  const { recovered, error } = state;

  return (
    <div>
      <PostActionBar state={state} isNew={!postId} slug={slug} />

      {recovered && (
        <div className="note note-warning flex flex-wrap items-center gap-3 mb-6 animate-slideUp">
          <span className="flex-1">
            Unsaved changes from {new Date(recovered.savedAt).toLocaleString()} are still here.
          </span>
          <button onClick={state.restoreDraft} className="btn btn-secondary btn-sm">
            Restore
          </button>
          <button onClick={state.discardDraft} className="btn btn-ghost btn-sm">
            Discard
          </button>
        </div>
      )}
      {error && <p className="note note-danger mb-6">{error}</p>}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_19rem] gap-6 items-start">
        <WritingCanvas state={state} />
        <PostSidebar state={state} />
      </div>
    </div>
  );
}

function WritingCanvas({ state: { form, set, editorKey } }: { state: PostFormState }) {
  const words = countWords(form.content);
  return (
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
        <span className="tabular-nums">{words.toLocaleString()} words</span>
        <span aria-hidden>·</span>
        <span>{Math.max(1, Math.round(words / 225))} min read</span>
        <span className="ml-auto hidden sm:inline">Markdown paste supported</span>
      </div>
    </div>
  );
}
