'use client';
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Modal, Sheet } from '@/components/overlay';
import { useIsCompact } from '@czyblog/ui/hooks';
import { CircleCheck, Info, TriangleAlert, type LucideIcon } from 'lucide-react';

export type ConfirmTone = 'default' | 'danger' | 'warning' | 'success';

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
}

export interface NotifyOptions {
  title: string;
  message?: string;
  okLabel?: string;
  tone?: ConfirmTone;
}

type Resolver = (ok: boolean) => void;

type DialogState =
  { kind: 'confirm'; opts: ConfirmOptions } | { kind: 'notify'; opts: NotifyOptions };

interface ConfirmCtx {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
  notify: (opts: NotifyOptions) => Promise<void>;
}

const Ctx = createContext<ConfirmCtx | null>(null);

export function useConfirm() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useConfirm must be used inside <ConfirmProvider>');
  return ctx.confirm;
}

export function useNotify() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useNotify must be used inside <ConfirmProvider>');
  return ctx.notify;
}

const TONE_STYLES: Record<ConfirmTone, { btn: string; ring: string; icon: LucideIcon }> = {
  default: {
    btn: 'btn-primary',
    ring: 'bg-surface-sunken text-content-secondary ring-1 ring-line',
    icon: Info,
  },
  danger: {
    btn: 'btn-tone-danger',
    ring: 'bg-danger-soft text-danger-content',
    icon: TriangleAlert,
  },
  warning: { btn: 'btn-warn', ring: 'bg-warning-soft text-warning-content', icon: TriangleAlert },
  success: {
    btn: 'btn-tone-success',
    ring: 'bg-success-soft text-success-content',
    icon: CircleCheck,
  },
};

// A confirmation is a speed bump, reserved for destructive or hard-to-undo actions;
// routine ones use a toast (asking about everything trains people to click through).
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DialogState | null>(null);
  const [open, setOpen] = useState(false);
  const resolverRef = useRef<Resolver | null>(null);
  const compact = useIsCompact();

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setState({ kind: 'confirm', opts: options });
      setOpen(true);
    });
  }, []);

  const notify = useCallback((options: NotifyOptions) => {
    return new Promise<void>((resolve) => {
      resolverRef.current = () => resolve();
      setState({ kind: 'notify', opts: options });
      setOpen(true);
    });
  }, []);

  // Answer immediately; let the surface animate out on its own so the caller never waits.
  const close = useCallback((ok: boolean) => {
    resolverRef.current?.(ok);
    resolverRef.current = null;
    setOpen(false);
  }, []);

  const value = useMemo(() => ({ confirm, notify }), [confirm, notify]);

  const opts = state?.opts;
  const isNotify = state?.kind === 'notify';
  const tone = TONE_STYLES[opts?.tone ?? (isNotify ? 'danger' : 'default')];

  const body = opts && (
    <>
      <div className="flex items-start gap-4">
        <div
          className={`flex-shrink-0 w-10 h-10 rounded-full grid place-items-center ${tone.ring}`}
          aria-hidden
        >
          <tone.icon className="w-[18px] h-[18px]" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 id="confirm-title" className="t-heading text-content">
            {opts.title}
          </h2>
          {opts.message && <p className="t-secondary mt-1.5 whitespace-pre-line">{opts.message}</p>}
        </div>
      </div>
      <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
        {!isNotify && (
          <button onClick={() => close(false)} className="btn btn-secondary sm:w-auto">
            {(opts as ConfirmOptions).cancelLabel ?? 'Cancel'}
          </button>
        )}
        <button data-autofocus onClick={() => close(true)} className={`btn ${tone.btn}`}>
          {isNotify
            ? ((opts as NotifyOptions).okLabel ?? 'OK')
            : ((opts as ConfirmOptions).confirmLabel ?? 'Confirm')}
        </button>
      </div>
    </>
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      {compact ? (
        <Sheet
          open={open}
          onClose={() => close(isNotify)}
          labelledBy="confirm-title"
          className="pb-6"
        >
          <div className="pb-2">{body}</div>
        </Sheet>
      ) : (
        <Modal open={open} onClose={() => close(isNotify)} labelledBy="confirm-title">
          {body}
        </Modal>
      )}
    </Ctx.Provider>
  );
}
