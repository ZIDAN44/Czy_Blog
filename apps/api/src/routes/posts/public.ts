import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { prisma, Prisma } from '../../db.js';
import { serializePost } from '../../lib/serialize.js';
import { pageArgs, paginated, paginationSchema, publishedPostWhere } from '../../lib/queries.js';
import { slugField, slugParam } from '../../lib/schemas.js';
import { postInclude } from './shared.js';

// Search is an unanchored LIKE over two columns; cap the needle so it can't be made expensive.
const MAX_SEARCH_LENGTH = 100;

const listQuery = paginationSchema({ maxLimit: 50, defaultLimit: 10 }).extend({
  tag: slugField.optional(),
  category: slugField.optional(),
  q: z.string().trim().min(1).max(MAX_SEARCH_LENGTH).optional(),
});

async function listPublished(req: FastifyRequest, reply: FastifyReply) {
  const q = listQuery.parse(req.query);

  const where: Prisma.PostWhereInput = publishedPostWhere();
  if (q.tag) where.tags = { some: { tag: { slug: q.tag } } };
  if (q.category) where.category = { slug: q.category };
  if (q.q)
    where.OR = [
      { title: { contains: q.q, mode: 'insensitive' } },
      { excerpt: { contains: q.q, mode: 'insensitive' } },
    ];

  const [total, posts] = await Promise.all([
    prisma.post.count({ where }),
    prisma.post.findMany({
      where,
      include: postInclude,
      orderBy: { publishedAt: 'desc' },
      ...pageArgs(q),
    }),
  ]);

  return reply.send({
    data: posts.map(serializePost),
    pagination: paginated(total, q.page, q.limit),
  });
}

async function getPublished(req: FastifyRequest, reply: FastifyReply) {
  const { slug } = slugParam.parse(req.params);
  const post = await prisma.post.findFirst({
    where: { ...publishedPostWhere(), slug },
    include: postInclude,
  });
  if (!post) return reply.code(404).send({ error: 'Not found' });
  // Fire-and-forget: a failed view bump must not fail the read.
  // Raw SQL on purpose: prisma.post.update() would also stamp @updatedAt, turning
  // every read (crawlers included) into an "edit" — the dashboard's "Edited" time
  // and the reader's sitemap lastmod both read updated_at. Tagged template, so
  // the id is a bound parameter.
  prisma.$executeRaw`UPDATE "Post" SET "viewCount" = "viewCount" + 1 WHERE "id" = ${post.id}`.catch(
    (err) => req.log.warn({ err }, 'failed to increment view count'),
  );
  return reply.send({ data: serializePost(post) });
}

export async function publicPostRoutes(app: FastifyInstance) {
  app.get('/', listPublished);
  app.get('/:slug', getPublished);
}
