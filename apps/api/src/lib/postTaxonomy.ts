import { prisma, Role } from '../db.js';
import { toSlug } from './slug.js';
import { canManageTaxonomy } from './rbac.js';

// Each tag is a row plus a possible insert; cap it before it's a write-amplification vector.
export const MAX_TAGS_PER_POST = 25;

// Only EDITOR+ may implicitly create a category; lower roles must reference an
// existing slug, so they can't mint taxonomy through the post-create back door.
export async function resolveCategoryId(input: string, role: Role): Promise<string | null> {
  const slug = toSlug(input);
  const existing = await prisma.category.findUnique({ where: { slug } });
  if (existing) return existing.id;
  if (!canManageTaxonomy(role)) return null;
  const name =
    input
      .replace(/[-_]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, (c) => c.toUpperCase()) || slug;
  // upsert collapses a concurrent same-slug create into a single winner.
  const cat = await prisma.category.upsert({
    where: { slug },
    update: {},
    create: { slug, name },
  });
  return cat.id;
}

export async function resolveTagIds(rawSlugs: string[], role: Role): Promise<string[]> {
  // Normalise first: slug is a tag's identity, so `My Tag`/`my-tag`/`MY-TAG` aren't three rows.
  const slugs = [...new Set(rawSlugs.map(toSlug).filter(Boolean))].slice(0, MAX_TAGS_PER_POST);
  if (!slugs.length) return [];

  if (canManageTaxonomy(role)) {
    // Race-safe: skipDuplicates means a concurrent same-tag create skips, not throws.
    await prisma.tag.createMany({
      data: slugs.map((slug) => ({ slug, name: slug })),
      skipDuplicates: true,
    });
    const all = await prisma.tag.findMany({ where: { slug: { in: slugs } }, select: { id: true } });
    return all.map((t) => t.id);
  }

  // Lower roles: only attach tags that already exist; ignore unknown slugs.
  const existing = await prisma.tag.findMany({
    where: { slug: { in: slugs } },
    select: { id: true },
  });
  return existing.map((t) => t.id);
}
