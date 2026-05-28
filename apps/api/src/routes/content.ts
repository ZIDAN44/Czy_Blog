import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma, PostStatus } from '../db.js';
import { config } from '../config.js';

const postSelect = {
  slug: true,
  title: true,
  excerpt: true,
  coverImageUrl: true,
  publishedAt: true,
  author: { select: { name: true } },
} as const;

type ContentPost = {
  slug: string;
  title: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  publishedAt: Date | null;
  author: { name: string };
};

function serializeContentPost(p: ContentPost) {
  return {
    title: p.title,
    link: `${config.publicSiteUrl}/posts/${p.slug}`,
    published_date: p.publishedAt,
    author: p.author.name,
    description: p.excerpt,
    cover_image: p.coverImageUrl,
  };
}

export async function contentRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.apiKeyAuth);

  app.get('/posts', async (req, reply) => {
    const q = z
      .object({
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(50).default(10),
      })
      .parse(req.query);

    const where = {
      status: PostStatus.PUBLISHED,
      deletedAt: null,
      publishedAt: { lte: new Date() },
    };

    const [total, posts] = await Promise.all([
      prisma.post.count({ where }),
      prisma.post.findMany({
        where,
        select: postSelect,
        orderBy: { publishedAt: 'desc' },
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
    ]);

    return reply.send({
      data: posts.map(serializeContentPost),
      pagination: {
        page: q.page,
        limit: q.limit,
        total,
        pages: Math.ceil(total / q.limit),
      },
    });
  });

  app.get('/posts/:slug', async (req, reply) => {
    const { slug } = z.object({ slug: z.string() }).parse(req.params);
    const post = await prisma.post.findFirst({
      where: {
        slug,
        status: PostStatus.PUBLISHED,
        deletedAt: null,
        publishedAt: { lte: new Date() },
      },
      select: postSelect,
    });
    if (!post) return reply.code(404).send({ error: 'Not found' });
    return reply.send({ data: serializeContentPost(post) });
  });
}
