'use client';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { SPRING_SMOOTH, prefersReducedMotion } from '@czyblog/ui/motion';
import { useFocusTrap, useScrollLock, useSpring, useSpringEffect } from '@czyblog/ui/hooks';
import { closingClass, useEscapeKey, usePortal } from './shared';

// Modal — a centred, blocking surface. It materialises (blur+scale+opacity together)
// rather than fades, and exit runs enter in reverse.
interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  labelledBy?: string;
  /** Where the surface should scale from — pass the trigger's position. */
  origin?: string;
  className?: string;
  /** Dismiss on scrim click. Off for anything with unsaved input. */
  dismissOnScrim?: boolean;
}

export default function Modal({
  open,
  onClose,
  children,
  labelledBy,
  origin = 'center',
  className = '',
  dismissOnScrim = true,
}: ModalProps) {
  const host = usePortal();
  const progress = useSpring(0);
  const [mounted, setMounted] = useState(false);
  const trapRef = useFocusTrap(open && mounted);

  useEffect(() => {
    if (open) {
      setMounted(true);
      progress.to(1, SPRING_SMOOTH);
    } else if (mounted) {
      progress.to(0, { ...SPRING_SMOOTH, response: 0.28, onRest: () => setMounted(false) });
    }
    // `mounted` is omitted from deps: it would re-trigger the exit.
  }, [open, progress]);

  useScrollLock(mounted);
  useEscapeKey(mounted, onClose);

  const scrimRef = useSpringEffect(progress, (el, p) => {
    el.style.opacity = String(p);
  });

  const reduced = prefersReducedMotion();
  const surfaceRef = useSpringEffect(progress, (el, p) => {
    el.style.opacity = String(Math.min(1, p * 1.4));
    if (reduced) return;
    const scale = 0.94 + 0.06 * p;
    el.style.transform = `translate3d(0, ${(1 - p) * 8}px, 0) scale(${scale})`;
    el.style.filter = p < 0.999 ? `blur(${(1 - p) * 10}px)` : '';
  });

  if (!host || !mounted) return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${closingClass(open)}`}
    >
      <div
        ref={scrimRef}
        className="scrim absolute inset-0"
        onClick={dismissOnScrim ? onClose : undefined}
        aria-hidden
      />
      <div
        ref={(el) => {
          surfaceRef(el);
          trapRef.current = el;
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        style={{ transformOrigin: origin }}
        className={`surface relative w-full max-w-md p-6 will-move ${className}`}
      >
        {children}
      </div>
    </div>,
    host,
  );
}
