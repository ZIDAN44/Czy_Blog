'use client';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, Send } from 'lucide-react';
import { postUrl } from '@/lib/site';
import { STATUS_NAME, STATUS_PILL } from '@/lib/utils';
import SaveState from './SaveState';
import type { PostFormState } from './usePostForm';

// Page bar: where you are, save state, and the moves that matter.
export default function PostActionBar({
  state,
  isNew,
  slug,
}: {
  state: PostFormState;
  isNew: boolean;
  slug?: string;
}) {
  const { busy, current, save, canPublish } = state;
  const blocked = busy !== null || !state.form.title.trim();

  return (
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
          <SaveState dirty={state.dirty} savedAt={state.savedAt} busy={busy !== null} />
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
        <button disabled={blocked} onClick={() => save('DRAFT')} className="btn btn-secondary">
          {busy === 'DRAFT' ? 'Saving…' : 'Save draft'}
        </button>
        {canPublish ? (
          <button disabled={blocked} onClick={() => save('PUBLISHED')} className="btn btn-primary">
            <Send />
            {busy === 'PUBLISHED' ? 'Publishing…' : current === 'PUBLISHED' ? 'Update' : 'Publish'}
          </button>
        ) : (
          <button
            disabled={blocked}
            onClick={() => save('PENDING_REVIEW')}
            className="btn btn-primary"
          >
            <Send /> {busy === 'PENDING_REVIEW' ? 'Sending…' : 'Submit for review'}
          </button>
        )}
      </div>
    </div>
  );
}
