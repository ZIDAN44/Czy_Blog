// The reader's public origin, e.g. https://blog.example.com. The same setting the
// API uses for RSS and `canonical_link`, so every absolute URL the site emits
// (canonical, Open Graph, sitemap) agrees with the feed. No trailing slash.
export const SITE_URL = (process.env.PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(
  /\/+$/,
  '',
);

export const SITE_NAME = 'Czy Blog';

export const SITE_DESCRIPTION =
  'A personal blog of essays and notes on things worth thinking about.';

// Next.js replaces a parent's `openGraph` with a page's rather than merging the
// two, so every page spreads these in to keep the site name and locale.
export const OPEN_GRAPH_BASE = { siteName: SITE_NAME, locale: 'en_US' } as const;
