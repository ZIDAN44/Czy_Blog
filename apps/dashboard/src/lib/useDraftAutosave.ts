'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

interface DraftEnvelope<T> {
  data: T;
  savedAt: number;
}

interface Recovered<T> {
  data: T;
  savedAt: number;
}

// Persists a form snapshot to localStorage so unsaved work survives a tab close/crash.
// Writes are trailing-debounced and flushed when the tab hides. `baseline` is the last
// server-saved JSON — while the snapshot matches it, nothing is stored or offered.
export function useDraftAutosave<T>(key: string, value: T, baseline: string, delay = 1000) {
  const [recovered, setRecovered] = useState<Recovered<T> | null>(null);

  const valueRef = useRef(value);
  valueRef.current = value;
  const baselineRef = useRef(baseline);
  baselineRef.current = baseline;

  const write = useCallback(() => {
    if (JSON.stringify(valueRef.current) === baselineRef.current) {
      localStorage.removeItem(key);
      return;
    }
    const envelope: DraftEnvelope<T> = { data: valueRef.current, savedAt: Date.now() };
    localStorage.setItem(key, JSON.stringify(envelope));
  }, [key]);

  // Offer recovery once on mount, only if the stored draft differs from server state.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const env = JSON.parse(raw) as DraftEnvelope<T>;
      if (JSON.stringify(env.data) === baselineRef.current) {
        localStorage.removeItem(key);
      } else {
        setRecovered({ data: env.data, savedAt: env.savedAt });
      }
    } catch {
      localStorage.removeItem(key);
    }
  }, [key]);

  // Trailing debounce: each change resets the timer; we write after `delay` of calm.
  useEffect(() => {
    const t = setTimeout(write, delay);
    return () => clearTimeout(t);
  }, [value, baseline, delay, write]);

  // A closing/backgrounded tab may never reach the debounce — flush immediately.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') write();
    };
    window.addEventListener('pagehide', write);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.removeEventListener('pagehide', write);
      document.removeEventListener('visibilitychange', onHide);
    };
  }, [write]);

  const clear = useCallback(() => {
    localStorage.removeItem(key);
    setRecovered(null);
  }, [key]);

  return { recovered, dismissRecovered: () => setRecovered(null), clear };
}
