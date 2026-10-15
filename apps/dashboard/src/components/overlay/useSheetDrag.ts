'use client';
import { useRef, type MutableRefObject } from 'react';
import {
  SPRING_SHEET,
  VelocityTracker,
  project,
  rubberband,
  type SpringValue,
} from '@czyblog/ui/motion';

/** Past this fraction of the sheet's height, a release commits to dismissing. */
const DISMISS_FRACTION = 0.4;
/** A flick this fast decides on its own, wherever the sheet happens to be. */
const FLICK_VELOCITY = 550;

// Drag-to-dismiss for a bottom sheet: tracks the finger 1:1, rubber-bands past the
// top edge, and on release projects the throw to decide dismiss vs. snap back.
export function useSheetDrag({
  y,
  heightRef,
  onDismiss,
}: {
  y: SpringValue;
  heightRef: MutableRefObject<number>;
  /** Called with the release velocity, so the exit can carry it. */
  onDismiss: (velocity: number) => void;
}) {
  const dragging = useRef(false);
  const grabOffset = useRef(0);
  const tracker = useRef(new VelocityTracker());
  const height = () => heightRef.current || window.innerHeight;

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragging.current = true;
    // Start from the live value, not the target, so catching a moving sheet doesn't jump.
    y.stop();
    grabOffset.current = e.clientY - y.current;
    tracker.current.reset();
    tracker.current.add(e.clientY);
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging.current) return;
    tracker.current.add(e.clientY);
    const raw = e.clientY - grabOffset.current;
    // Pulling above the rest position rubber-bands instead of stopping dead.
    y.set(raw < 0 ? rubberband(raw, height()) : raw);
  }

  function endDrag(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging.current) return;
    dragging.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
    const velocity = tracker.current.velocity;
    // Where the throw was going, not where the finger left off.
    const projected = y.current + project(velocity);
    const flicked = Math.abs(velocity) > FLICK_VELOCITY;
    const dismiss = flicked ? velocity > 0 : projected > height() * DISMISS_FRACTION;
    if (dismiss) onDismiss(velocity);
    else y.to(0, { ...SPRING_SHEET, velocity });
  }

  return {
    dragging,
    handlers: { onPointerDown, onPointerMove, onPointerUp: endDrag, onPointerCancel: endDrag },
  };
}
