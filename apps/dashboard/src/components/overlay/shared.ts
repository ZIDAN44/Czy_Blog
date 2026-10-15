'use client';
import { useEffect, useState } from 'react';

/** document.body once mounted (null during SSR), for createPortal. */
export function usePortal(): HTMLElement | null {
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => setHost(document.body), []);
  return host;
}

// Escape dismisses the current surface; only listen while mounted, or a stale
// listener would close a surface that already left.
export function useEscapeKey(active: boolean, onClose: () => void) {
  useEffect(() => {
    if (!active) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, onClose]);
}

/** Click-through while closing, so a fading scrim never swallows the next click. */
export const closingClass = (open: boolean) => (open ? '' : 'pointer-events-none');
