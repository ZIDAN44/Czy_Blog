import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { prisma, PostStatus, Role, Prisma } from '../../db.js';
import { serializePost } from '../../lib/serialize.js';
import { pageArgs, paginated, paginationSchema } from '../../lib/queries.js';
import { idParam } from '../../lib/schemas.js';
import { purgePostMedia } from '../../lib/mediaCleanup.js';
import { createPost } from './create.js';
import { editableOrDeny, postInclude } from './shared.js';
import { updatePost } from './update.js';

const listQuery = paginationSchema({ maxLimit: 100, defaultLimit: 20 }).extend({
  status: z.enum(PostStatus).optional(),
  mine: z.stringbool().optional(),
});

async function listAdmin(req: FastifyRequest) {
  const q = listQuery.parse(req.query);

  const where: Prisma.PostWhereInput = { deletedAt: null };
  if (q.status) where.status = q.status;
  // Contributors can only see their own posts; authors only their own; editors+ see all.
  if (q.mine || req.user.role === Role.CONTRIBUTOR || req.user.role === Role.AUTHOR) {
    where.authorId = req.user.sub;
  }

  const [total, posts] = await Promise.all([
    prisma.post.count({ where }),
    prisma.post.findMany({
      where,
      include: postInclude,
      orderBy: { updatedAt: 'desc' },
      ...pageArgs(q),
    }),
  ]);
  return { data: posts.map(serializePost), pagination: paginated(total, q.page, q.limit) };
}

async function getAdmin(req: FastifyRequest, reply: FastifyReply) {
  const { id } = idParam.parse(req.params);
  const found = await prisma.post.findUnique({ where: { id }, include: postInclude });
  const post = editableOrDeny(req, reply, found);
  if (!post) return reply;
  return { data: serializePost(post) };
}

// Soft delete: archived and hidden, so references and history survive.
async function deletePost(req: FastifyRequest, reply: FastifyReply) {
  const { id } = idParam.parse(req.params);
  const post = editableOrDeny(req, reply, await prisma.post.findUnique({ where: { id } }));
  if (!post) return reply;
  await prisma.post.update({
    where: { id },
    data: { deletedAt: new Date(), status: PostStatus.ARCHIVED },
  });
  // Reclaim this post's media; best-effort, the sweep catches leftovers.
  await purgePostMedia(post, req.log).catch((err) => req.log.error(err));
  return { ok: true };
}

export async function adminPostRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);
  app.get('/', listAdmin);
  app.get('/:id', getAdmin);
  app.post('/', createPost);
  app.patch('/:id', updatePost);
  app.delete('/:id', deletePost);
}
