'use client';
import { useMovingIndicator } from '@/lib/useMotion';

export interface Segment<T extends string> {
  value: T;
  label: React.ReactNode;
  /** Spoken label, for when `label` is an icon rather than a word. */
  srLabel?: string;
}

interface Props<T extends string> {
  segments: Segment<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  size?: 'sm' | 'md';
  className?: string;
}

// Selection slides between positions (useMovingIndicator, shared with the nav).
export default function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
  label,
  size = 'md',
  className = '',
}: Props<T>) {
  const { trackRef, indicatorRef, setItem } = useMovingIndicator<
    T,
    HTMLDivElement,
    HTMLSpanElement
  >(value);
  const item = size === 'sm' ? 'h-6 px-1.5 text-xs' : 'h-7 px-2.5 text-[0.8125rem]';

  return (
    <div
      ref={trackRef}
      role="tablist"
      aria-label={label}
      className={`relative inline-flex items-center gap-0.5 p-[3px] rounded-[0.625rem] bg-surface-sunken shadow-[inset_0_0_0_1px_var(--color-line)] ${className}`}
    >
      <span
        ref={indicatorRef}
        aria-hidden
        className="absolute top-[3px] bottom-[3px] left-0 rounded-[0.4375rem] bg-surface shadow-[var(--shadow-chip),0_0_0_1px_var(--color-line)] will-move"
      />
      {segments.map((s) => {
        const active = s.value === value;
        return (
          <button
            key={s.value}
            ref={setItem(s.value)}
            type="button"
            role="tab"
            aria-selected={active}
            aria-label={s.srLabel}
            title={s.srLabel}
            onClick={() => onChange(s.value)}
            className={`relative z-10 inline-flex items-center justify-center gap-1.5 font-medium rounded-[0.4375rem] whitespace-nowrap active:!scale-100 ${item} ${
              active ? 'text-content' : 'text-content-tertiary hover:text-content'
            }`}
          >
            {s.label}
          </button>
        );
      })}
    </div>
  );
}
