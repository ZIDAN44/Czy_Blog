'use client';
import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { SPRING_SNAPPY, prefersReducedMotion } from '@/lib/motion';
import { useSpring } from '@/lib/useMotion';

export interface Segment<T extends string> {
  value: T;
  label: string;
  /** Spoken label, for when `label` is a glyph rather than a word. */
  srLabel?: string;
}

interface Props<T extends string> {
  segments: Segment<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
}

/**
 * The selection is one object that moves between positions, rather than a
 * highlight that blinks off here and on over there. Because it is sprung,
 * changing selection mid-flight re-targets from wherever it currently is —
 * it never jumps back to the start.
 *
 * Position and width run on independent springs; a single spring over both
 * desynchronises whenever they have different distances to travel.
 */
export default function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
  label,
  className = '',
}: Props<T>) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef(new Map<T, HTMLButtonElement>());
  const indicatorRef = useRef<HTMLSpanElement | null>(null);
  const x = useSpring(0);
  const width = useSpring(0);
  const settled = useRef(false);

  const paint = useCallback(() => {
    const el = indicatorRef.current;
    if (!el) return;
    el.style.transform = `translate3d(${x.current}px, 0, 0)`;
    el.style.width = `${width.current}px`;
  }, [x, width]);

  useEffect(() => {
    const off = [x.subscribe(paint), width.subscribe(paint)];
    return () => off.forEach((fn) => fn());
  }, [x, width, paint]);

  const measure = useCallback(
    (animate: boolean) => {
      const active = itemRefs.current.get(value);
      const track = trackRef.current;
      if (!active || !track) return;
      const left = active.offsetLeft;
      const w = active.offsetWidth;
      if (!animate || prefersReducedMotion()) {
        x.set(left);
        width.set(w);
        paint();
        return;
      }
      x.to(left, SPRING_SNAPPY);
      width.to(w, SPRING_SNAPPY);
    },
    [value, x, width, paint],
  );

  useLayoutEffect(() => {
    measure(settled.current);
    settled.current = true;
  }, [measure]);

  // Layout can change under the indicator — keep it glued to its segment.
  useEffect(() => {
    const track = trackRef.current;
    if (!track || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => measure(false));
    observer.observe(track);
    return () => observer.disconnect();
  }, [measure]);

  return (
    <div
      ref={trackRef}
      role="tablist"
      aria-label={label}
      className={`relative inline-flex gap-1 p-1 rounded-xl bg-surface-sunken border border-line ${className}`}
    >
      {/* The moving selection is a raised chip: it sits above the sunken
          track, which is what makes "selected" read without a colour change. */}
      <span
        ref={indicatorRef}
        aria-hidden
        className="absolute top-1 bottom-1 left-0 rounded-lg bg-surface border border-line shadow-[var(--shadow-chip)] will-move"
      />
      {segments.map((s) => {
        const active = s.value === value;
        return (
          <button
            key={s.value}
            ref={(el) => {
              if (el) itemRefs.current.set(s.value, el);
              else itemRefs.current.delete(s.value);
            }}
            role="tab"
            aria-selected={active}
            aria-label={s.srLabel}
            onClick={() => onChange(s.value)}
            className={`relative z-10 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors ${
              active ? 'text-content' : 'text-content-secondary hover:text-content'
            }`}
          >
            {s.label}
          </button>
        );
      })}
    </div>
  );
}
