'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

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
  | { kind: 'confirm'; opts: ConfirmOptions }
  | { kind: 'notify'; opts: NotifyOptions };

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

const TONE_STYLES: Record<ConfirmTone, { btn: string; ring: string; icon: string }> = {
  default: {
    btn: 'bg-gradient-to-b from-indigo-600 to-indigo-700 hover:brightness-110 text-white shadow-sm',
    ring: 'bg-indigo-100 text-indigo-700',
    icon: 'i',
  },
  danger: {
    btn: 'bg-gradient-to-b from-red-600 to-red-700 hover:brightness-110 text-white shadow-sm',
    ring: 'bg-red-100 text-red-600',
    icon: '!',
  },
  warning: {
    btn: 'bg-gradient-to-b from-amber-500 to-amber-600 hover:brightness-110 text-white shadow-sm',
    ring: 'bg-amber-100 text-amber-700',
    icon: '!',
  },
  success: {
    btn: 'bg-gradient-to-b from-emerald-600 to-emerald-700 hover:brightness-110 text-white shadow-sm',
    ring: 'bg-emerald-100 text-emerald-700',
    icon: '✓',
  },
};

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DialogState | null>(null);
  const resolverRef = useRef<Resolver | null>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setState({ kind: 'confirm', opts: options });
    });
  }, []);

  const notify = useCallback((options: NotifyOptions) => {
    return new Promise<void>((resolve) => {
      resolverRef.current = () => resolve();
      setState({ kind: 'notify', opts: options });
    });
  }, []);

  const close = useCallback((ok: boolean) => {
    resolverRef.current?.(ok);
    resolverRef.current = null;
    setState(null);
  }, []);

  useEffect(() => {
    if (!state) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close(state?.kind === 'notify');
      if (e.key === 'Enter') close(true);
    }
    window.addEventListener('keydown', onKey);
    confirmBtnRef.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [state, close]);

  const opts = state?.opts;
  const isNotify = state?.kind === 'notify';
  const tone = TONE_STYLES[opts?.tone ?? (isNotify ? 'danger' : 'default')];

  return (
    <Ctx.Provider value={{ confirm, notify }}>
      {children}
      {state && opts && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-md animate-fadeIn"
          onClick={() => close(isNotify ? true : false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
        >
          <div
            className="bg-white rounded-2xl shadow-2xl ring-1 ring-slate-900/5 max-w-md w-full p-6 animate-popIn"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <div
                className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold ${tone.ring}`}
                aria-hidden
              >
                {tone.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h2 id="confirm-title" className="font-semibold text-slate-900">
                  {opts.title}
                </h2>
                {opts.message && (
                  <p className="text-sm text-slate-600 mt-1 whitespace-pre-line">{opts.message}</p>
                )}
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              {!isNotify && (
                <button
                  onClick={() => close(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  {(opts as ConfirmOptions).cancelLabel ?? 'Cancel'}
                </button>
              )}
              <button
                ref={confirmBtnRef}
                onClick={() => close(true)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tone.btn}`}
              >
                {isNotify
                  ? ((opts as NotifyOptions).okLabel ?? 'OK')
                  : ((opts as ConfirmOptions).confirmLabel ?? 'Confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}
