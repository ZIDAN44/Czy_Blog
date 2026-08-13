'use client';
import { useEffect, useState } from 'react';
import SegmentedControl, { type Segment } from '@/components/SegmentedControl';
import { applyTheme, readTheme, storeTheme, type ThemePreference } from '@/lib/theme';

const SEGMENTS: Segment<ThemePreference>[] = [
  { value: 'system', label: 'Auto' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

const COMPACT: Segment<ThemePreference>[] = [
  { value: 'system', label: '◐', srLabel: 'Match system appearance' },
  { value: 'light', label: '☀', srLabel: 'Light appearance' },
  { value: 'dark', label: '☾', srLabel: 'Dark appearance' },
];

/**
 * Appearance is offered, not decided for people: "Auto" follows the system
 * and is the default, and the other two are there for anyone who wants this
 * app to differ from it.
 */
export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [pref, setPref] = useState<ThemePreference>('system');

  // The inline bootstrap script has already stamped the attribute; this only
  // catches the React state up with what is on screen.
  useEffect(() => setPref(readTheme()), []);

  // While on "Auto", a change to the OS setting has to reach the theme-color
  // meta too — the CSS follows on its own.
  useEffect(() => {
    if (pref !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const sync = () => applyTheme('system', true);
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, [pref]);

  function choose(next: ThemePreference) {
    setPref(next);
    storeTheme(next);
    applyTheme(next);
  }

  return (
    <SegmentedControl
      segments={compact ? COMPACT : SEGMENTS}
      value={pref}
      onChange={choose}
      label="Appearance"
    />
  );
}
