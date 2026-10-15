'use client';
import { createContext, useCallback, useContext, useRef, useState } from 'react';
import ToastItem from './ToastItem';
import type { ToastOptions, ToastRecord } from './types';

const MAX_VISIBLE = 4;
const Ctx = createContext<((opts: ToastOptions) => void) | null>(null);

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((opts: ToastOptions) => {
    const id = nextId.current++;
    // Newest first: the thing that just happened is nearest the thumb.
    setToasts((list) => [{ ...opts, id }, ...list].slice(0, MAX_VISIBLE));
  }, []);

  return (
    <Ctx.Provider value={toast}>
      {children}
      <div
        className="fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-end sm:px-6 pointer-events-none"
        role="region"
        aria-label="Notifications"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </Ctx.Provider>
  );
}
