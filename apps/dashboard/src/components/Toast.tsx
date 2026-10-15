'use client';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  SPRING_SMOOTH,
  SPRING_SNAPPY,
  VelocityTracker,
  prefersReducedMotion,
  project,
} from '@czyblog/ui/motion';
import { useSpring } from '@czyblog/ui/hooks';
import { CircleAlert, CircleCheck, Info, TriangleAlert, X, type LucideIcon } from 'lucide-react';

// Non-blocking feedback that only needs to be seen (status/success/warning/error);
// dialogs stay reserved for actual decisions.
export type ToastTone = 'status' | 'success' | 'warning' | 'error';

export interface ToastOptions {
  title: string;
  message?: string;
  tone?: ToastTone;
  /** Milliseconds on screen. Errors stay until dismissed by default. */
  duration?: number;
}

interface ToastRecord extends ToastOptions {
  id: number;
}

const Ctx = createContext<((opts: ToastOptions) => void) | null>(null);

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

const TONE: Record<ToastTone, { color: string; icon: LucideIcon }> = {
  status: { color: 'text-content-secondary', icon: Info },
  success: { color: 'text-success', icon: CircleCheck },
  warning: { color: 'text-warning', icon: TriangleAlert },
  error: { color: 'text-danger', icon: CircleAlert },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((opts: ToastOptions) => {
    const id = nextId.current++;
    // Newest first: the thing that just happened is nearest the thumb.
    setToasts((list) => [{ ...opts, id }, ...list].slice(0, 4));
  }, []);

  const value = useMemo(() => toast, [toast]);

  return (
    <Ctx.Provider value={value}>
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

function ToastItem({ toast, onDismiss }: { toast: ToastRecord; onDismiss: () => void }) {
  const tone = TONE[toast.tone ?? 'status'];
  const enter = useSpring(0);
  const x = useSpring(0);
  const elRef = useRef<HTMLDivElement | null>(null);
  const dragging = useRef(false);
  const grabX = useRef(0);
  const tracker = useRef(new VelocityTracker());
  const timer = useRef<number | null>(null);
  const reduced = prefersReducedMotion();

  // Measured on mount and each grab, never in the frame loop — reading layout
  // while writing it stutters the drag.
  const widthRef = useRef(320);

  const paint = useCallback(() => {
    const el = elRef.current;
    if (!el) return;
    const e = enter.current;
    const dx = x.current;
    const width = widthRef.current;
    el.style.opacity = String(Math.max(0, Math.min(1, e) * (1 - Math.abs(dx) / width)));
    el.style.transform = reduced
      ? ''
      : `translate3d(${dx}px, ${(1 - e) * 14}px, 0) scale(${0.96 + 0.04 * Math.min(e, 1)})`;
  }, [enter, x, reduced]);

  const startTimer = useCallback(() => {
    const duration = toast.duration ?? (toast.tone === 'error' ? 8000 : 4200);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      enter.to(0, { ...SPRING_SMOOTH, response: 0.3, onRest: onDismiss });
    }, duration);
  }, [toast.duration, toast.tone, enter, onDismiss]);

  useEffect(() => {
    widthRef.current = elRef.current?.offsetWidth || 320;
    const unsubscribe = [enter.subscribe(paint), x.subscribe(paint)];
    enter.to(1, SPRING_SNAPPY);
    startTimer();
    return () => {
      unsubscribe.forEach((off) => off());
      if (timer.current) window.clearTimeout(timer.current);
    };
    // Runs once per toast: the entrance should not restart on re-render.
  }, []);

  function hold() {
    if (timer.current) window.clearTimeout(timer.current);
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragging.current = true;
    hold();
    widthRef.current = e.currentTarget.offsetWidth || 320;
    x.stop();
    grabX.current = e.clientX - x.current;
    tracker.current.reset();
    tracker.current.add(e.clientX);
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging.current) return;
    tracker.current.add(e.clientX);
    x.set(e.clientX - grabX.current);
  }

  function endDrag(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging.current) return;
    dragging.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
    const velocity = tracker.current.velocity;
    const width = widthRef.current;
    const projected = x.current + project(velocity);
    if (Math.abs(projected) > width * 0.45) {
      x.to(Math.sign(projected) * width * 1.2, {
        ...SPRING_SMOOTH,
        response: 0.3,
        velocity,
        onRest: onDismiss,
      });
    } else {
      // Not far enough: throw it home, carrying the velocity it had.
      x.to(0, { ...SPRING_SMOOTH, velocity });
      startTimer();
    }
  }

  return (
    <div
      ref={elRef}
      role={toast.tone === 'error' ? 'alert' : 'status'}
      aria-live={toast.tone === 'error' ? 'assertive' : 'polite'}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onMouseEnter={hold}
      onMouseLeave={startTimer}
      onFocus={hold}
      onBlur={startTimer}
      className="surface pointer-events-auto w-full max-w-sm p-3.5 pr-2.5 flex items-start gap-3 !rounded-xl will-move select-none cursor-grab active:cursor-grabbing"
      style={{ touchAction: 'pan-y' }}
    >
      <tone.icon className={`w-[18px] h-[18px] flex-shrink-0 mt-px ${tone.color}`} aria-hidden />
      <div className="flex-1 min-w-0">
        <p className="t-subheading text-content">{toast.title}</p>
        {toast.message && <p className="t-caption mt-0.5">{toast.message}</p>}
      </div>
      <button
        onClick={() => enter.to(0, { ...SPRING_SMOOTH, response: 0.28, onRest: onDismiss })}
        className="btn btn-ghost btn-icon btn-sm -mt-1 -mr-0.5"
        aria-label="Dismiss notification"
      >
        <X />
      </button>
    </div>
  );
}
