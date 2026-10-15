'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { SPRING_SHEET } from '@czyblog/ui/motion';
import { useFocusTrap, useScrollLock, useSpring } from '@czyblog/ui/hooks';
import { closingClass, useEscapeKey, usePortal } from './shared';
import { useSheetDrag } from './useSheetDrag';

// Sheet — the modal's touch form: slides up from the bottom, drag the grip to dismiss.
interface SheetProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  labelledBy?: string;
  className?: string;
  dismissOnScrim?: boolean;
}

export default function Sheet({
  open,
  onClose,
  children,
  labelledBy,
  className = '',
  dismissOnScrim = true,
}: SheetProps) {
  const host = usePortal();
  const [mounted, setMounted] = useState(false);
  const y = useSpring(0);
  const heightRef = useRef(0);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const scrimEl = useRef<HTMLDivElement | null>(null);
  const trapRef = useFocusTrap(open && mounted);
  /** Velocity of the gesture that asked for the dismissal, handed to the exit. */
  const exitVelocity = useRef(0);
  const { dragging, handlers } = useSheetDrag({
    y,
    heightRef,
    onDismiss: (velocity) => {
      exitVelocity.current = velocity;
      onClose();
    },
  });

  useScrollLock(mounted);
  useEscapeKey(mounted, onClose);

  // Position drives both the sheet and how dark the scrim is.
  const applyY = useCallback((value: number) => {
    if (sheetRef.current) sheetRef.current.style.transform = `translate3d(0, ${value}px, 0)`;
    const h = heightRef.current || 1;
    if (scrimEl.current)
      scrimEl.current.style.opacity = String(Math.max(0, Math.min(1, 1 - value / h)));
  }, []);
  useEffect(() => y.subscribe(applyY), [y, applyY]);

  useEffect(() => {
    if (open) {
      setMounted(true);
      return;
    }
    if (!mounted) return;
    const h = heightRef.current || window.innerHeight;
    y.to(h, {
      ...SPRING_SHEET,
      bounce: 0,
      velocity: exitVelocity.current,
      onRest: () => setMounted(false),
    });
    exitVelocity.current = 0;
    // `mounted` is omitted from deps: it would re-trigger the exit.
  }, [open, y]);

  // Enter from below, once the real height is known.
  const attach = useCallback(
    (el: HTMLDivElement | null) => {
      sheetRef.current = el;
      trapRef.current = el;
      if (!el) return;
      heightRef.current = el.offsetHeight;
      if (open && !dragging.current) {
        y.set(heightRef.current);
        y.to(0, SPRING_SHEET);
      }
    },
    [open, y, trapRef, dragging],
  );

  if (!host || !mounted) return null;

  return createPortal(
    <div className={`fixed inset-0 z-50 flex items-end justify-center ${closingClass(open)}`}>
      <div
        ref={scrimEl}
        className="scrim absolute inset-0"
        onClick={dismissOnScrim ? onClose : undefined}
        aria-hidden
      />
      <div
        ref={attach}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={`surface relative w-full max-w-lg will-move rounded-b-none pb-[max(1.25rem,env(safe-area-inset-bottom))] ${className}`}
        style={{ touchAction: 'none' }}
      >
        <div
          {...handlers}
          className="flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing"
        >
          <span className="h-1 w-9 rounded-full bg-content-tertiary" aria-hidden />
        </div>
        <div className="px-6 pt-2">{children}</div>
      </div>
    </div>,
    host,
  );
}
