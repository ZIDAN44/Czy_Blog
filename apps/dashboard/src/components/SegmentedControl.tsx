'use client';
import { useMovingIndicator } from '@/lib/useMotion';

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
 * The selection is one object that moves between positions — see
 * `useMovingIndicator`, which this shares with the dashboard's nav rail.
 */
export default function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
  label,
  className = '',
}: Props<T>) {
  const { trackRef, indicatorRef, setItem } = useMovingIndicator<
    T,
    HTMLDivElement,
    HTMLSpanElement
  >(value);

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
            ref={setItem(s.value)}
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
