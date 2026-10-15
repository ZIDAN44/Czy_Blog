import type { FastifyReply, FastifyRequest } from 'fastify';
import type { z } from 'zod';
import { prisma, PostStatus, Prisma, Role, type Post } from '../../db.js';
import { uniquePostSlug } from '../../lib/slug.js';
import { coerceStatus } from '../../lib/rbac.js';
import { serializePost } from '../../lib/serialize.js';
import { idParam } from '../../lib/schemas.js';
import { resolveCategoryId, resolveTagIds } from '../../lib/postTaxonomy.js';
import { asJson, editableOrDeny, isFutureDate, postInclude, updateSchema } from './shared.js';

type UpdateBody = z.infer<typeof updateSchema>;
type Failure = { status: number; error: string };

/** Plain field edits. A changed title also re-derives the slug. */
async function fieldChanges(
  body: UpdateBody,
  post: Post,
): Promise<Prisma.PostUncheckedUpdateInput> {
  const data: Prisma.PostUncheckedUpdateInput = {};
  if (body.title) {
    data.title = body.title;
    if (body.title !== post.title) data.slug = await uniquePostSlug(body.title, post.id);
  }
  if (body.excerpt !== undefined) data.excerpt = body.excerpt;
  if (body.content) data.content = asJson(body.content);
  if (body.coverImageUrl !== undefined) data.coverImageUrl = body.coverImageUrl;
  if (body.scheduledFor !== undefined) {
    data.scheduledFor = body.scheduledFor ? new Date(body.scheduledFor) : null;
  }
  return data;
}

/** Applies a requested status change (role-checked) and enforces the schedule rule. */
function statusChange(
  body: UpdateBody,
  post: Post,
  role: Role,
  data: Prisma.PostUncheckedUpdateInput,
): Failure | null {
  // Status after this request; decides whether a past scheduledFor is allowed.
  let effectiveStatus = post.status;
  if (body.status) {
    const target = coerceStatus(role, body.status);
    if (target === null) return { status: 403, error: 'Not allowed to set that status' };
    data.status = target;
    effectiveStatus = target;
    if (target === PostStatus.PUBLISHED && !post.publishedAt) data.publishedAt = new Date();
  }
  if (effectiveStatus === PostStatus.SCHEDULED) {
    // Whether newly SCHEDULED or already: a past scheduledFor would publish on the next tick.
    const raw = body.scheduledFor === undefined ? post.scheduledFor : body.scheduledFor;
    if (!isFutureDate(raw ? new Date(raw) : null)) {
      return { status: 400, error: 'scheduledFor must be in the future' };
    }
  }
  return null;
}

export async function updatePost(req: FastifyRequest, reply: FastifyReply) {
  const { id } = idParam.parse(req.params);
  const body = updateSchema.parse(req.body);
  const post = editableOrDeny(req, reply, await prisma.post.findUnique({ where: { id } }));
  if (!post) return reply;

  const data = await fieldChanges(body, post);
  const failure = statusChange(body, post, req.user.role, data);
  if (failure) return reply.code(failure.status).send({ error: failure.error });

  if (body.categorySlug !== undefined) {
    data.categoryId = body.categorySlug
      ? await resolveCategoryId(body.categorySlug, req.user.role)
      : null;
  }
  const tagIds = body.tagSlugs ? await resolveTagIds(body.tagSlugs, req.user.role) : null;

  // Replace tags (delete + insert) in one tx with the update, so a failure can't strip tags and stop.
  const updated = await prisma.$transaction(async (tx) => {
    if (tagIds) {
      await tx.postTag.deleteMany({ where: { postId: id } });
      data.tags = { create: tagIds.map((tagId) => ({ tagId })) };
    }
    return tx.post.update({ where: { id }, data, include: postInclude });
  });
  return { data: serializePost(updated) };
}
