'use client';
import { useEffect, useRef, useState } from 'react';
import { Link2 } from 'lucide-react';
import { Modal } from '@/components/overlay';

interface LinkModalProps {
  open: boolean;
  initialUrl: string;
  hasExisting: boolean;
  onClose: () => void;
  onSubmit: (url: string) => void;
  onRemove: () => void;
}

export default function LinkModal({
  open,
  initialUrl,
  hasExisting,
  onClose,
  onSubmit,
  onRemove,
}: LinkModalProps) {
  const [url, setUrl] = useState(initialUrl);
  const inputRef = useRef<HTMLInputElement>(null);

  // The field belongs to this opening, not to the last one.
  useEffect(() => {
    if (!open) return;
    setUrl(initialUrl);
    const id = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
    return () => window.clearTimeout(id);
  }, [open, initialUrl]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy="link-modal-title"
      // Typed input here — a stray backdrop click shouldn't discard it.
      dismissOnScrim={false}
    >
      <form onSubmit={submit}>
        <div className="flex items-center gap-3">
          <span className="grid place-items-center w-9 h-9 rounded-lg bg-surface-sunken ring-1 ring-line text-content-secondary">
            <Link2 className="w-4 h-4" />
          </span>
          <div>
            <h2 id="link-modal-title" className="t-heading">
              {hasExisting ? 'Edit link' : 'Insert link'}
            </h2>
            <p className="t-caption">Point the selected text somewhere.</p>
          </div>
        </div>

        <label className="block mt-5">
          <span className="field-label">URL</span>
          <input
            ref={inputRef}
            data-autofocus
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            type="url"
            className="input font-mono text-[0.8125rem]"
          />
        </label>

        <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          {hasExisting && (
            <button type="button" onClick={onRemove} className="btn btn-danger sm:mr-auto">
              Remove link
            </button>
          )}
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            {hasExisting ? 'Update' : 'Insert'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
