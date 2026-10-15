'use client';
import { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '@czyblog/ui/motion';
import { useSpring, useSpringEffect } from '@czyblog/ui/hooks';
import { closingClass, useEscapeKey } from './shared';

// Popover — a non-blocking panel. No scrim (it doesn't take over), and it scales
// from its trigger so the button-to-panel relationship stays obvious.
interface PopoverProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Corner the panel grows out of — the trigger's corner. */
  origin?: string;
  className?: string;
}

export default function Popover({
  open,
  onClose,
  children,
  origin = 'top right',
  className = '',
}: PopoverProps) {
  const progress = useSpring(0);
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open) {
      setMounted(true);
      progress.to(1, { bounce: 0, response: 0.26 });
    } else if (mounted) {
      progress.to(0, { bounce: 0, response: 0.2, onRest: () => setMounted(false) });
    }
  }, [open, progress]);

  const reduced = prefersReducedMotion();
  const ref = useSpringEffect(progress, (el, p) => {
    el.style.opacity = String(Math.min(1, p * 1.6));
    if (reduced) return;
    el.style.transform = `scale(${0.92 + 0.08 * p})`;
  });

  useEscapeKey(mounted, onClose);

  useEffect(() => {
    if (!mounted) return;
    function onDown(e: MouseEvent) {
      if (!panelRef.current?.contains(e.target as Node)) onClose();
    }
    // Deferred so the opening click doesn't immediately close it.
    const id = window.setTimeout(() => document.addEventListener('mousedown', onDown), 0);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener('mousedown', onDown);
    };
  }, [mounted, onClose]);

  if (!mounted) return null;

  return (
    <div
      ref={(el) => {
        ref(el);
        panelRef.current = el;
      }}
      style={{ transformOrigin: origin }}
      className={`surface absolute z-40 will-move ${closingClass(open)} ${className}`}
    >
      {children}
    </div>
  );
}
