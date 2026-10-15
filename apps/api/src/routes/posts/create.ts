import type { FastifyReply, FastifyRequest } from 'fastify';
import { prisma, PostStatus } from '../../db.js';
import { uniquePostSlug } from '../../lib/slug.js';
import { coerceStatus } from '../../lib/rbac.js';
import { serializePost } from '../../lib/serialize.js';
import { resolveCategoryId, resolveTagIds } from '../../lib/postTaxonomy.js';
import { asJson, createSchema, isFutureDate, postInclude } from './shared.js';

export async function createPost(req: FastifyRequest, reply: FastifyReply) {
  const body = createSchema.parse(req.body);

  const requestedStatus = body.status ?? PostStatus.DRAFT;
  const finalStatus = coerceStatus(req.user.role, requestedStatus);
  if (finalStatus === null) {
    return reply.code(403).send({ error: 'Not allowed to set that status' });
  }

  // SCHEDULED needs a future scheduledFor, else the next tick makes it an instant-publish back door.
  const scheduledFor = body.scheduledFor ? new Date(body.scheduledFor) : null;
  if (finalStatus === PostStatus.SCHEDULED && !isFutureDate(scheduledFor)) {
    return reply.code(400).send({ error: 'scheduledFor must be in the future' });
  }

  const slug = await uniquePostSlug(body.title);
  const categoryId = body.categorySlug
    ? await resolveCategoryId(body.categorySlug, req.user.role)
    : null;
  const tagIds = await resolveTagIds(body.tagSlugs ?? [], req.user.role);

  const post = await prisma.post.create({
    data: {
      slug,
      title: body.title,
      excerpt: body.excerpt,
      content: asJson(body.content),
      coverImageUrl: body.coverImageUrl,
      status: finalStatus,
      publishedAt: finalStatus === PostStatus.PUBLISHED ? new Date() : null,
      scheduledFor: finalStatus === PostStatus.SCHEDULED ? scheduledFor : null,
      authorId: req.user.sub,
      categoryId,
      tags: { create: tagIds.map((tagId) => ({ tagId })) },
    },
    include: postInclude,
  });
  return reply.code(201).send({ data: serializePost(post) });
}
