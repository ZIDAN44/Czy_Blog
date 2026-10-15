import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { PostStatus, Prisma } from '../../db.js';
import { canEditPost } from '../../lib/rbac.js';
import { httpUrlField } from '../../lib/schemas.js';
import { blockDocSchema } from '../../lib/content.js';
import { MAX_TAGS_PER_POST } from '../../lib/postTaxonomy.js';

export const postInclude = {
  author: { select: { id: true, name: true, avatarUrl: true, bio: true } },
  category: true,
  tags: { include: { tag: true } },
} as const;

export const createSchema = z.object({
  title: z.string().trim().min(1).max(200),
  excerpt: z.string().max(500).optional(),
  content: blockDocSchema,
  coverImageUrl: httpUrlField.optional(),
  categorySlug: z.string().trim().min(1).max(96).optional(),
  tagSlugs: z.array(z.string().trim().min(1).max(96)).max(MAX_TAGS_PER_POST).optional(),
  status: z.enum(PostStatus).optional(),
  scheduledFor: z.iso.datetime().optional(),
});

export const updateSchema = createSchema.partial();

export function isFutureDate(d: Date | null | undefined): d is Date {
  return !!d && d.getTime() > Date.now();
}

// Already validated by blockDocSchema; this just restates the type for Prisma's JSON column.
export function asJson(doc: unknown): Prisma.InputJsonValue {
  return doc as Prisma.InputJsonValue;
}

/**
 * Gate for admin reads/writes: passes a live post the caller may edit through,
 * otherwise sends 404/403 and returns null. Missing and soft-deleted posts are
 * indistinguishable to the client.
 */
export function editableOrDeny<T extends { deletedAt: Date | null; authorId: string }>(
  req: FastifyRequest,
  reply: FastifyReply,
  post: T | null,
): T | null {
  if (!post || post.deletedAt) {
    reply.code(404).send({ error: 'Not found' });
    return null;
  }
  if (!canEditPost(req.user.role, req.user.sub, post.authorId)) {
    reply.code(403).send({ error: 'Forbidden' });
    return null;
  }
  return post;
}
