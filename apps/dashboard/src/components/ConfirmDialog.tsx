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

type Resolver = (ok: boolean) => void;

interface ConfirmCtx {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
}

const Ctx = createContext<ConfirmCtx | null>(null);

export function useConfirm() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useConfirm must be used inside <ConfirmProvider>');
  return ctx.confirm;
}

const TONE_STYLES: Record<ConfirmTone, { btn: string; ring: string; icon: string }> = {
  default: {
    btn: 'bg-slate-900 hover:bg-slate-800 text-white',
    ring: 'bg-slate-100 text-slate-600',
    icon: 'i',
  },
  danger: {
    btn: 'bg-red-600 hover:bg-red-700 text-white',
    ring: 'bg-red-100 text-red-600',
    icon: '!',
  },
  warning: {
    btn: 'bg-amber-500 hover:bg-amber-600 text-white',
    ring: 'bg-amber-100 text-amber-700',
    icon: '!',
  },
  success: {
    btn: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    ring: 'bg-emerald-100 text-emerald-700',
    icon: '✓',
  },
};

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<Resolver | null>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setOpts(options);
    });
  }, []);

  const close = useCallback((ok: boolean) => {
    resolverRef.current?.(ok);
    resolverRef.current = null;
    setOpts(null);
  }, []);

  useEffect(() => {
    if (!opts) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close(false);
      if (e.key === 'Enter') close(true);
    }
    window.addEventListener('keydown', onKey);
    confirmBtnRef.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [opts, close]);

  const tone = TONE_STYLES[opts?.tone ?? 'default'];

  return (
    <Ctx.Provider value={{ confirm }}>
      {children}
      {opts && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-[fadeIn_120ms_ease-out]"
          onClick={() => close(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-[popIn_140ms_ease-out]"
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
              <button
                onClick={() => close(false)}
                className="px-4 py-2 rounded-lg border bg-white text-sm hover:bg-slate-50"
              >
                {opts.cancelLabel ?? 'Cancel'}
              </button>
              <button
                ref={confirmBtnRef}
                onClick={() => close(true)}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${tone.btn}`}
              >
                {opts.confirmLabel ?? 'Confirm'}
              </button>
            </div>
          </div>
          <style>{`
            @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
            @keyframes popIn {
              from { opacity: 0; transform: scale(0.96) translateY(4px) }
              to { opacity: 1; transform: scale(1) translateY(0) }
            }
          `}</style>
        </div>
      )}
    </Ctx.Provider>
  );
}
