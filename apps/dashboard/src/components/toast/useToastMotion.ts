'use client';
import { useCallback, useEffect, useRef } from 'react';
import {
  SPRING_SMOOTH,
  SPRING_SNAPPY,
  VelocityTracker,
  prefersReducedMotion,
  project,
} from '@czyblog/ui/motion';
import { useSpring } from '@czyblog/ui/hooks';

const FALLBACK_WIDTH = 320;
/** Past this fraction of its width, a release throws the toast away. */
const DISMISS_FRACTION = 0.45;

// Entrance, auto-dismiss timer (paused on hover/focus/drag) and swipe-to-dismiss
// for one toast. Springs write straight to the element, bypassing React.
export function useToastMotion({
  duration,
  onDismiss,
}: {
  duration: number;
  onDismiss: () => void;
}) {
  const enter = useSpring(0);
  const x = useSpring(0);
  const elRef = useRef<HTMLDivElement | null>(null);
  const timer = useRef<number | null>(null);
  // Measured on mount and each grab, never in the frame loop: reading layout
  // while writing it stutters the drag.
  const widthRef = useRef(FALLBACK_WIDTH);
  const reduced = prefersReducedMotion();

  const paint = useCallback(() => {
    const el = elRef.current;
    if (!el) return;
    const e = enter.current;
    const dx = x.current;
    el.style.opacity = String(Math.max(0, Math.min(1, e) * (1 - Math.abs(dx) / widthRef.current)));
    el.style.transform = reduced
      ? ''
      : `translate3d(${dx}px, ${(1 - e) * 14}px, 0) scale(${0.96 + 0.04 * Math.min(e, 1)})`;
  }, [enter, x, reduced]);

  const hold = useCallback(() => {
    if (timer.current) window.clearTimeout(timer.current);
  }, []);

  const exit = useCallback(
    (response = 0.3) => enter.to(0, { ...SPRING_SMOOTH, response, onRest: onDismiss }),
    [enter, onDismiss],
  );

  const resume = useCallback(() => {
    hold();
    timer.current = window.setTimeout(() => exit(), duration);
  }, [hold, exit, duration]);

  useEffect(() => {
    widthRef.current = elRef.current?.offsetWidth || FALLBACK_WIDTH;
    const unsubscribe = [enter.subscribe(paint), x.subscribe(paint)];
    enter.to(1, SPRING_SNAPPY);
    resume();
    return () => {
      unsubscribe.forEach((off) => off());
      hold();
    };
    // Runs once per toast: the entrance should not restart on re-render.
  }, []);

  const swipe = useSwipe({ x, widthRef, hold, resume, onDismiss });
  return { elRef, hold, resume, dismiss: () => exit(0.28), swipe };
}

function useSwipe({
  x,
  widthRef,
  hold,
  resume,
  onDismiss,
}: {
  x: ReturnType<typeof useSpring>;
  widthRef: React.MutableRefObject<number>;
  hold: () => void;
  resume: () => void;
  onDismiss: () => void;
}) {
  const dragging = useRef(false);
  const grabX = useRef(0);
  const tracker = useRef(new VelocityTracker());

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragging.current = true;
    hold();
    widthRef.current = e.currentTarget.offsetWidth || FALLBACK_WIDTH;
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
    if (Math.abs(projected) > width * DISMISS_FRACTION) {
      x.to(Math.sign(projected) * width * 1.2, {
        ...SPRING_SMOOTH,
        response: 0.3,
        velocity,
        onRest: onDismiss,
      });
    } else {
      // Not far enough: throw it home, carrying the velocity it had.
      x.to(0, { ...SPRING_SMOOTH, velocity });
      resume();
    }
  }

  return { onPointerDown, onPointerMove, onPointerUp: endDrag, onPointerCancel: endDrag };
}
