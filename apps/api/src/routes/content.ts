import type { FastifyInstance } from 'fastify';
import { prisma, Prisma } from '../db.js';
import { postPublicUrl } from '../lib/urls.js';
import { pageArgs, paginated, paginationSchema, publishedPostWhere } from '../lib/queries.js';
import { slugParam } from '../lib/schemas.js';

const postSelect = {
  slug: true,
  title: true,
  excerpt: true,
  coverImageUrl: true,
  publishedAt: true,
  author: { select: { name: true } },
} as const;

// Derived from postSelect so a mismatch is a compile error, not a silent bug.
type ContentPost = Prisma.PostGetPayload<{ select: typeof postSelect }>;

function serializeContentPost(p: ContentPost) {
  return {
    title: p.title,
    link: postPublicUrl(p.slug),
    published_date: p.publishedAt,
    author: p.author.name,
    description: p.excerpt,
    cover_image: p.coverImageUrl,
  };
}

export async function contentRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.apiKeyAuth);

  app.get('/posts', async (req, reply) => {
    const q = paginationSchema({ maxLimit: 50, defaultLimit: 10 }).parse(req.query);
    const where = publishedPostWhere();

    const [total, posts] = await Promise.all([
      prisma.post.count({ where }),
      prisma.post.findMany({
        where,
        select: postSelect,
        orderBy: { publishedAt: 'desc' },
        ...pageArgs(q),
      }),
    ]);

    return reply.send({
      data: posts.map(serializeContentPost),
      pagination: paginated(total, q.page, q.limit),
    });
  });

  app.get('/posts/:slug', async (req, reply) => {
    const { slug } = slugParam.parse(req.params);
    const post = await prisma.post.findFirst({
      where: { ...publishedPostWhere(), slug },
      select: postSelect,
    });
    if (!post) return reply.code(404).send({ error: 'Not found' });
    return reply.send({ data: serializeContentPost(post) });
  });
}
