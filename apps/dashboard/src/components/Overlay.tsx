'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  SPRING_SHEET,
  SPRING_SMOOTH,
  VelocityTracker,
  prefersReducedMotion,
  project,
  rubberband,
} from '@/lib/motion';
import { useFocusTrap, useScrollLock, useSpring, useSpringEffect } from '@/lib/useMotion';

/* ------------------------------------------------------------------ *
 * Portal host
 * ------------------------------------------------------------------ */

function usePortal(): HTMLElement | null {
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => setHost(document.body), []);
  return host;
}

/**
 * Escape dismisses whatever surface is up. Every overlay below needs it, and
 * it must only listen while the surface is actually mounted — a stale listener
 * would close a surface that has already left.
 */
function useEscapeKey(active: boolean, onClose: () => void) {
  useEffect(() => {
    if (!active) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, onClose]);
}

/* ------------------------------------------------------------------ *
 * Modal — a centred surface for a task that blocks
 *
 * It materialises rather than fades: blur, scale and opacity move together,
 * so the glass reads as a real surface arriving. Enter and exit run the same
 * path in reverse, so dismissing returns it to where it came from.
 * ------------------------------------------------------------------ */

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

export function Modal({
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
    // `mounted` would re-trigger the exit if it were a dependency.
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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

/* ------------------------------------------------------------------ *
 * Sheet — the same task, on a device you hold
 *
 * Tracks the finger 1:1, resists past the top edge instead of stopping dead,
 * and on release projects where the throw was going before deciding whether
 * to dismiss. It can be caught mid-flight and thrown back.
 * ------------------------------------------------------------------ */

interface SheetProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  labelledBy?: string;
  className?: string;
  dismissOnScrim?: boolean;
}

/** Past this fraction of the sheet's height, a release commits to dismissing. */
const DISMISS_FRACTION = 0.4;
/** A flick this fast decides on its own, wherever the sheet happens to be. */
const FLICK_VELOCITY = 550;

export function Sheet({
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
  const dragging = useRef(false);
  const grabOffset = useRef(0);
  const tracker = useRef(new VelocityTracker());

  useScrollLock(mounted);

  const applyY = useCallback((value: number) => {
    const sheet = sheetRef.current;
    if (sheet) sheet.style.transform = `translate3d(0, ${value}px, 0)`;
    const scrim = scrimEl.current;
    const h = heightRef.current || 1;
    if (scrim) scrim.style.opacity = String(Math.max(0, Math.min(1, 1 - value / h)));
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
    [open, y, trapRef],
  );

  useEscapeKey(mounted, onClose);

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    dragging.current = true;
    // Start from the live on-screen value, not the target: catching a moving
    // sheet must not make it jump.
    y.stop();
    grabOffset.current = e.clientY - y.current;
    tracker.current.reset();
    tracker.current.add(e.clientY);
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging.current) return;
    tracker.current.add(e.clientY);
    const raw = e.clientY - grabOffset.current;
    // Pulling above the resting position resists progressively — the sheet
    // stays responsive, it just says there is nothing more up there.
    const next = raw < 0 ? rubberband(raw, heightRef.current || window.innerHeight) : raw;
    y.set(next);
  }

  function endDrag(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging.current) return;
    dragging.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
    const velocity = tracker.current.velocity;
    const h = heightRef.current || window.innerHeight;
    // Where the throw was going, not where the finger left off.
    const projected = y.current + project(velocity);
    const flicked = Math.abs(velocity) > FLICK_VELOCITY;
    const dismiss = flicked ? velocity > 0 : projected > h * DISMISS_FRACTION;

    if (dismiss) {
      exitVelocity.current = velocity;
      onClose();
    } else {
      y.to(0, { ...SPRING_SHEET, velocity });
    }
  }

  if (!host || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center">
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
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
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

/* ------------------------------------------------------------------ *
 * Popover — a parallel, non-blocking panel
 *
 * No scrim: it does not take over, so it should not dim what it sits beside.
 * It scales from its trigger, so the relationship between the button and what
 * it opened stays obvious.
 * ------------------------------------------------------------------ */

interface PopoverProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Corner the panel grows out of — the trigger's corner. */
  origin?: string;
  className?: string;
}

export function Popover({
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
    // Deferred so the click that opened it does not immediately close it.
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
      className={`surface absolute z-40 will-move ${className}`}
    >
      {children}
    </div>
  );
}
