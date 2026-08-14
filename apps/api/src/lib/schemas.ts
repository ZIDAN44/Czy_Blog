import { z } from 'zod';

export const emailField = z
  .email()
  .max(254) // RFC 5321 maximum path length
  .transform((s) => s.trim().toLowerCase());

// bcrypt only considers the first 72 bytes, and every extra byte is work the
// hash function does on an unauthenticated request. Bound both ends.
export const passwordField = z.string().min(8).max(72);

/**
 * URLs that will end up in an `href`/`src` rendered by a browser. `z.url()`
 * alone accepts anything `new URL()` parses — including `javascript:` and
 * `data:`, which is a stored-XSS primitive once the value is rendered.
 */
// The hostname is deliberately unconstrained: `localhost` is a legitimate
// image host in development and behind an internal reverse proxy.
export const httpUrlField = z.url({ protocol: /^https?$/ }).max(2048);

// Database identifiers are cuids: lowercase alphanumeric, no separators.
// Bounding them keeps unbounded strings out of index lookups.
const idField = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9]+$/, 'Invalid id');

// Slugs are produced by `toSlug`, so they are lowercase alphanumeric + hyphen.
export const slugField = z
  .string()
  .min(1)
  .max(96)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug');

export const idParam = z.object({ id: idField });
export const slugParam = z.object({ slug: slugField });
