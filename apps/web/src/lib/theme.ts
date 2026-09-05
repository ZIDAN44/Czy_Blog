// Appearance preference. Three states: "system" (default) follows the OS; an
// explicit choice sets data-theme="dark"|"light" on the root (matching globals.css),
// which wins over prefers-color-scheme.
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

// A theme swap is a full-viewport brightness change, so `data-theme-swap` arms a
// short colour transition for the length of the swap, then is removed so it never
// lingers on ordinary interactions.
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
    // Private browsing: the choice just won't outlive the session.
  }
}

// Runs before first paint, inlined in <head>: without it a dark-mode user gets a
// white flash before hydration applies the stored choice. Also sets the theme-color
// meta here so an explicit choice can override it later. Kept minimal + try/catch
// because it blocks rendering.
export const THEME_BOOTSTRAP =
  `try{var t=localStorage.getItem('${THEME_KEY}');` +
  `if(t!=='dark'&&t!=='light'){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}` +
  `else{document.documentElement.setAttribute('data-theme',t)}` +
  `var m=document.querySelector('meta[name=theme-color]');` +
  `if(m){m.setAttribute('content',t==='dark'?'${CANVAS.dark}':'${CANVAS.light}')}` +
  `}catch(e){}`;
