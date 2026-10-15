'use client';
import { useEffect, useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import SegmentedControl, { type Segment } from './SegmentedControl';
import { applyTheme, readTheme, storeTheme, type ThemePreference } from '../theme';

const ICON = 'w-3.5 h-3.5';

const SEGMENTS: Segment<ThemePreference>[] = [
  {
    value: 'system',
    label: (
      <>
        <Monitor className={ICON} /> Auto
      </>
    ),
  },
  {
    value: 'light',
    label: (
      <>
        <Sun className={ICON} /> Light
      </>
    ),
  },
  {
    value: 'dark',
    label: (
      <>
        <Moon className={ICON} /> Dark
      </>
    ),
  },
];

const COMPACT: Segment<ThemePreference>[] = [
  { value: 'system', label: <Monitor className={ICON} />, srLabel: 'Match system appearance' },
  { value: 'light', label: <Sun className={ICON} />, srLabel: 'Light appearance' },
  { value: 'dark', label: <Moon className={ICON} />, srLabel: 'Dark appearance' },
];

export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [pref, setPref] = useState<ThemePreference>('system');

  // The bootstrap script already stamped the attribute; this syncs React state to it.
  useEffect(() => setPref(readTheme()), []);

  // On "Auto", an OS change still has to reach the theme-color meta.
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
      size={compact ? 'sm' : 'md'}
    />
  );
}
