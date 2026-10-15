'use client';
import { CircleAlert, CircleCheck, Info, TriangleAlert, X, type LucideIcon } from 'lucide-react';
import type { ToastRecord, ToastTone } from './types';
import { useToastMotion } from './useToastMotion';

const TONE: Record<ToastTone, { color: string; icon: LucideIcon }> = {
  status: { color: 'text-content-secondary', icon: Info },
  success: { color: 'text-success', icon: CircleCheck },
  warning: { color: 'text-warning', icon: TriangleAlert },
  error: { color: 'text-danger', icon: CircleAlert },
};

export default function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastRecord;
  onDismiss: () => void;
}) {
  const isError = toast.tone === 'error';
  const tone = TONE[toast.tone ?? 'status'];
  const { elRef, hold, resume, dismiss, swipe } = useToastMotion({
    duration: toast.duration ?? (isError ? 8000 : 4200),
    onDismiss,
  });

  return (
    <div
      ref={elRef}
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
      {...swipe}
      onMouseEnter={hold}
      onMouseLeave={resume}
      onFocus={hold}
      onBlur={resume}
      className="surface pointer-events-auto w-full max-w-sm p-3.5 pr-2.5 flex items-start gap-3 !rounded-xl will-move select-none cursor-grab active:cursor-grabbing"
      style={{ touchAction: 'pan-y' }}
    >
      <tone.icon className={`w-[18px] h-[18px] flex-shrink-0 mt-px ${tone.color}`} aria-hidden />
      <div className="flex-1 min-w-0">
        <p className="t-subheading text-content">{toast.title}</p>
        {toast.message && <p className="t-caption mt-0.5">{toast.message}</p>}
      </div>
      <button
        onClick={dismiss}
        className="btn btn-ghost btn-icon btn-sm -mt-1 -mr-0.5"
        aria-label="Dismiss notification"
      >
        <X />
      </button>
    </div>
  );
}
