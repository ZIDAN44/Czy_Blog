import { z } from 'zod';

export const emailField = z
  .email()
  .max(254) // RFC 5321 maximum path length
  .transform((s) => s.trim().toLowerCase());

// bcrypt only hashes the first 72 bytes; cap length so extra bytes aren't free work.
export const passwordField = z.string().min(8).max(72);

// URLs rendered into href/src. Restrict to http(s) — bare z.url() accepts
// javascript:/data:, a stored-XSS primitive. Hostname is open on purpose (localhost).
export const httpUrlField = z.url({ protocol: /^https?$/ }).max(2048);

// cuid ids: lowercase alphanumeric, bounded to keep unbounded strings out of lookups.
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
