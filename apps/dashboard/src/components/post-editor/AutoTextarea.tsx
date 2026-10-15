'use client';
import { useLayoutEffect, useRef } from 'react';

// Grows with its content, so long titles wrap instead of scrolling sideways.
// Single-line semantics: pasted newlines become spaces.
export default function AutoTextarea({
  value,
  onChange,
  className,
  ...rest
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  placeholder?: string;
  'aria-label'?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\n/g, ' '))}
      className={`block overflow-hidden ${className ?? ''}`}
      {...rest}
    />
  );
}
