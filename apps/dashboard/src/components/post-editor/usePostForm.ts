'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, currentUser, type PostStatus } from '@/lib/api';
import { errMsg } from '@/lib/utils';
import { useDraftAutosave } from '@/lib/useDraftAutosave';
import { useConfirm } from '@/components/ConfirmDialog';
import { useToast } from '@/components/toast';
import {
  CONFIRM_FOR_STATUS,
  DONE_MESSAGE,
  EMPTY_POST,
  toPayload,
  type PostData,
} from './postModel';

// Everything the post editor knows: form state, local draft recovery, and saving.
export function usePostForm(postId: string | undefined, initial: Partial<PostData> | undefined) {
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();
  const [form, setForm] = useState<PostData>({ ...EMPTY_POST, ...initial });
  const [busy, setBusy] = useState<PostStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editorKey, setEditorKey] = useState(0);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [current, setCurrent] = useState<PostStatus>(form.status);
  const user = currentUser();

  // Last server-saved snapshot; while the form matches it, nothing is unsaved.
  const savedSnapshot = useRef(JSON.stringify(form));
  const draftKey = `czy:draft:${user?.id ?? 'anon'}:${postId ?? 'new'}`;
  const draft = useDraftAutosave(draftKey, form, savedSnapshot.current);

  function set<K extends keyof PostData>(key: K, value: PostData[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function restoreDraft() {
    if (!draft.recovered) return;
    setForm(draft.recovered.data);
    setEditorKey((k) => k + 1); // remount the editor with the restored document
    draft.dismissRecovered();
    toast({ title: 'Draft restored', tone: 'success' });
  }

  async function confirmMove(status: PostStatus): Promise<boolean> {
    const opts = CONFIRM_FOR_STATUS[status];
    if (!opts) return true;
    const message =
      status === 'SCHEDULED' && form.scheduledFor
        ? `${opts.message}\n\nScheduled for: ${new Date(form.scheduledFor).toLocaleString()}`
        : opts.message;
    return confirm({ ...opts, message });
  }

  async function save(status: PostStatus) {
    if (!(await confirmMove(status))) return;
    setBusy(status);
    setError(null);
    try {
      const body = JSON.stringify(toPayload(form, status));
      if (!postId) {
        const { data } = await api<{ data: { id: string } }>('/api/v1/admin/posts', {
          method: 'POST',
          body,
        });
        draft.clear();
        toast({ title: DONE_MESSAGE[status], message: form.title, tone: 'success' });
        router.replace(`/dashboard/posts/${data.id}/edit`);
        return;
      }
      await api(`/api/v1/admin/posts/${postId}`, { method: 'PATCH', body });
      savedSnapshot.current = JSON.stringify(form);
      setSavedAt(new Date());
      setCurrent(status);
      draft.clear();
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

  return {
    form,
    set,
    save,
    busy,
    error,
    editorKey,
    savedAt,
    current,
    dirty: JSON.stringify(form) !== savedSnapshot.current,
    canPublish: Boolean(user && user.role !== 'CONTRIBUTOR'),
    recovered: draft.recovered,
    restoreDraft,
    discardDraft: draft.clear,
  };
}

export type PostFormState = ReturnType<typeof usePostForm>;
