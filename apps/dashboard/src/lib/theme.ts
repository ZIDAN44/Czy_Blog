/**
 * Appearance preference.
 *
 * Three states, not two. "System" is the default and a real choice — most
 * people set light/dark once at the OS level and expect apps to follow; the
 * explicit options are for the ones who want this app to differ.
 *
 * The DOM contract, matching globals.css:
 *   data-theme="dark" | "light"  — an explicit choice, wins over the system
 *   (absent)                     — follow prefers-color-scheme
 */
export type ThemePreference = 'system' | 'light' | 'dark';

export const THEME_KEY = 'czyblog:theme';

/** Kept in sync with --color-canvas so the browser chrome matches the page. */
const CANVAS: Record<'light' | 'dark', string> = {
  light: '#fafafa',
  dark: '#0b0d10',
};

export function readTheme(): ThemePreference {
  if (typeof window === 'undefined') return 'system';
  const stored = localStorage.getItem(THEME_KEY);
  return stored === 'light' || stored === 'dark' ? stored : 'system';
}

export function resolveTheme(pref: ThemePreference): 'light' | 'dark' {
  if (pref !== 'system') return pref;
  if (typeof window === 'undefined' || !window.matchMedia) return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * A theme swap is a full-viewport brightness change — the one transition that
 * must never be a hard cut. `data-theme-swap` arms a short colour transition
 * for the length of the change and is removed straight after, so it never
 * lingers on ordinary interactions.
 */
export function applyTheme(pref: ThemePreference, animate = true) {
  const root = document.documentElement;

  if (animate) {
    root.setAttribute('data-theme-swap', '');
    window.setTimeout(() => root.removeAttribute('data-theme-swap'), 320);
  }

  if (pref === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', pref);

  const meta = document.querySelector('meta[name="theme-color"]:not([media])');
  if (meta) meta.setAttribute('content', CANVAS[resolveTheme(pref)]);
}

export function storeTheme(pref: ThemePreference) {
  try {
    if (pref === 'system') localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, pref);
  } catch {
    /* Private browsing: the choice just does not outlive the session. */
  }
}

/**
 * Runs before first paint, inlined in <head>.
 *
 * Without it a dark-mode user gets a white flash on every navigation — the
 * stored choice would only be applied after hydration. It also resolves the
 * theme-color meta, because a single unmediated meta is the only kind an
 * explicit choice can override later (browsers take the first match, and a
 * runtime-appended meta would lose to one rendered above it).
 *
 * Kept to the minimum amount of work, and wrapped in try/catch, because it
 * blocks rendering.
 */
export const THEME_BOOTSTRAP =
  `try{var t=localStorage.getItem('${THEME_KEY}');` +
  `if(t!=='dark'&&t!=='light'){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}` +
  `else{document.documentElement.setAttribute('data-theme',t)}` +
  `var m=document.querySelector('meta[name=theme-color]');` +
  `if(m){m.setAttribute('content',t==='dark'?'${CANVAS.dark}':'${CANVAS.light}')}` +
  `}catch(e){}`;
