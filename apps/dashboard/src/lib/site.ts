// Absolute links to the public reader (separate origin), resolved at runtime:
// PUBLIC_SITE_URL on the server, the value the root layout injects on the client.
const FALLBACK = 'http://localhost:3000';

declare global {
  interface Window {
    __SITE_URL__?: string;
  }
}

export function siteUrl(): string {
  if (typeof window === 'undefined') return process.env.PUBLIC_SITE_URL ?? FALLBACK;
  return window.__SITE_URL__ ?? FALLBACK;
}

export function postUrl(slug: string): string {
  return `${siteUrl()}/${slug}`;
}
