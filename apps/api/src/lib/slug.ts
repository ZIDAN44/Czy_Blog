import slugify from 'slugify';
import { customAlphabet } from 'nanoid';
import { prisma } from '../db.js';

const shortId = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 6);

export function toSlug(input: string): string {
  return slugify(input, { lower: true, strict: true, trim: true }).slice(0, 80) || shortId();
}

export async function uniquePostSlug(title: string, ignoreId?: string): Promise<string> {
  const base = toSlug(title);
  let candidate = base;
  for (let i = 0; i < 5; i++) {
    const existing = await prisma.post.findUnique({ where: { slug: candidate } });
    if (!existing || existing.id === ignoreId) return candidate;
    candidate = `${base}-${shortId()}`;
  }
  return `${base}-${shortId()}`;
}
