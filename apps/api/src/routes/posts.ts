import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma, PostStatus, Role, Prisma } from '../db.js';
import { toSlug, uniquePostSlug } from '../lib/slug.js';
import { canEditPost, canManageTaxonomy, coerceStatus } from '../lib/rbac.js';
import { serializePost } from '../lib/serialize.js';
import { paginated, paginationSchema, publishedPostWhere } from '../lib/queries.js';
import { idParam, slugParam } from '../lib/schemas.js';

const postInclude = {
  author: { select: { id: true, name: true, avatarUrl: true, bio: true } },
  category: true,
  tags: { include: { tag: true } },
} as const;

const blockDocSchema = z.object({ type: z.literal('doc'), content: z.array(z.any()) });

const createSchema = z.object({
  title: z.string().min(1).max(200),
  excerpt: z.string().max(500).optional(),
  content: blockDocSchema,
  coverImageUrl: z.string().url().optional(),
  categorySlug: z.string().optional(),
  tagSlugs: z.array(z.string()).optional(),
  status: z.enum(PostStatus).optional(),
  scheduledFor: z.iso.datetime().optional(),
});

const updateSchema = createSchema.partial();

function isFutureDate(d: Date | null | undefined): d is Date {
  return !!d && d.getTime() > Date.now();
}

// Resolve a category by slug. Only EDITOR+ may implicitly create one — for
// lower roles we require the slug to already exist so they cannot mint new
// taxonomy entries through the post-create back door.
async function resolveCategoryId(input: string, role: Role): Promise<string | null> {
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
  const cat = await prisma.category.create({ data: { slug, name } });
  return cat.id;
}

async function resolveTagIds(slugs: string[], role: Role): Promise<string[]> {
  if (!slugs.length) return [];
  const existing = await prisma.tag.findMany({ where: { slug: { in: slugs } } });
  if (canManageTaxonomy(role)) {
    const existingSlugs = new Set(existing.map((t) => t.slug));
    const toCreate = slugs.filter((s) => !existingSlugs.has(s));
    const created = await Promise.all(
      toCreate.map((slug) => prisma.tag.create({ data: { slug, name: slug } })),
    );
    return [...existing, ...created].map((t) => t.id);
  }
  // Lower roles: only attach tags that already exist; ignore unknown slugs.
  return existing.map((t) => t.id);
}

// Public read endpoints
export async function publicPostRoutes(app: FastifyInstance) {
  app.get('/', async (req, reply) => {
    const q = paginationSchema({ maxLimit: 50, defaultLimit: 10 })
      .extend({
        tag: z.string().optional(),
        category: z.string().optional(),
        q: z.string().optional(),
      })
      .parse(req.query);

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
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
    ]);

    return reply.send({
      data: posts.map(serializePost),
      pagination: paginated(total, q.page, q.limit),
    });
  });

  app.get('/:slug', async (req, reply) => {
    const { slug } = slugParam.parse(req.params);
    const post = await prisma.post.findFirst({
      where: { ...publishedPostWhere(), slug },
      include: postInclude,
    });
    if (!post) return reply.code(404).send({ error: 'Not found' });
    // Fire-and-forget view count
    prisma.post
      .update({ where: { id: post.id }, data: { viewCount: { increment: 1 } } })
      .catch(() => {});
    return reply.send({ data: serializePost(post) });
  });
}

// Authenticated post management endpoints
export async function adminPostRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  app.get('/', async (req) => {
    const q = paginationSchema({ maxLimit: 100, defaultLimit: 20 })
      .extend({
        status: z.enum(PostStatus).optional(),
        mine: z.coerce.boolean().optional(),
      })
      .parse(req.query);

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
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      }),
    ]);
    return {
      data: posts.map(serializePost),
      pagination: paginated(total, q.page, q.limit),
    };
  });

  app.get('/:id', async (req, reply) => {
    const { id } = idParam.parse(req.params);
    const post = await prisma.post.findUnique({ where: { id }, include: postInclude });
    if (!post || post.deletedAt) return reply.code(404).send({ error: 'Not found' });
    if (!canEditPost(req.user.role, req.user.sub, post.authorId)) {
      return reply.code(403).send({ error: 'Forbidden' });
    }
    return { data: serializePost(post) };
  });

  app.post('/', async (req, reply) => {
    const body = createSchema.parse(req.body);

    const requestedStatus = body.status ?? PostStatus.DRAFT;
    const finalStatus = coerceStatus(req.user.role, requestedStatus);
    if (finalStatus === null) {
      return reply.code(403).send({ error: 'Not allowed to set that status' });
    }

    // SCHEDULED requires a future scheduledFor — otherwise it's an
    // instant-publish back door for AUTHOR (the scheduler picks it up on next tick).
    if (
      finalStatus === PostStatus.SCHEDULED &&
      !isFutureDate(body.scheduledFor ? new Date(body.scheduledFor) : null)
    ) {
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
        content: body.content,
        coverImageUrl: body.coverImageUrl,
        status: finalStatus,
        publishedAt: finalStatus === PostStatus.PUBLISHED ? new Date() : null,
        scheduledFor:
          finalStatus === PostStatus.SCHEDULED && body.scheduledFor
            ? new Date(body.scheduledFor)
            : null,
        authorId: req.user.sub,
        categoryId,
        tags: { create: tagIds.map((tagId) => ({ tagId })) },
      },
      include: postInclude,
    });
    return reply.code(201).send({ data: serializePost(post) });
  });

  app.patch('/:id', async (req, reply) => {
    const { id } = idParam.parse(req.params);
    const body = updateSchema.parse(req.body);
    const post = await prisma.post.findUnique({ where: { id } });
    if (!post || post.deletedAt) return reply.code(404).send({ error: 'Not found' });
    if (!canEditPost(req.user.role, req.user.sub, post.authorId)) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    const data: Prisma.PostUncheckedUpdateInput = {};
    if (body.title) {
      data.title = body.title;
      if (body.title !== post.title) data.slug = await uniquePostSlug(body.title, id);
    }
    if (body.excerpt !== undefined) data.excerpt = body.excerpt;
    if (body.content) data.content = body.content;
    if (body.coverImageUrl !== undefined) data.coverImageUrl = body.coverImageUrl;
    if (body.scheduledFor !== undefined)
      data.scheduledFor = body.scheduledFor ? new Date(body.scheduledFor) : null;

    if (body.status) {
      const target = coerceStatus(req.user.role, body.status);
      if (target === null) {
        return reply.code(403).send({ error: 'Not allowed to set that status' });
      }
      data.status = target;
      if (target === PostStatus.SCHEDULED) {
        // If the request omitted scheduledFor, fall back to the post's existing value.
        const raw = body.scheduledFor === undefined ? post.scheduledFor : body.scheduledFor;
        if (!isFutureDate(raw ? new Date(raw) : null)) {
          return reply.code(400).send({ error: 'scheduledFor must be in the future' });
        }
      }
      if (target === PostStatus.PUBLISHED && !post.publishedAt) data.publishedAt = new Date();
    }

    if (body.categorySlug !== undefined) {
      data.categoryId = body.categorySlug
        ? await resolveCategoryId(body.categorySlug, req.user.role)
        : null;
    }

    if (body.tagSlugs) {
      const tagIds = await resolveTagIds(body.tagSlugs, req.user.role);
      await prisma.postTag.deleteMany({ where: { postId: id } });
      data.tags = { create: tagIds.map((tagId) => ({ tagId })) };
    }

    const updated = await prisma.post.update({ where: { id }, data, include: postInclude });
    return { data: serializePost(updated) };
  });

  app.delete('/:id', async (req, reply) => {
    const { id } = idParam.parse(req.params);
    const post = await prisma.post.findUnique({ where: { id } });
    if (!post || post.deletedAt) return reply.code(404).send({ error: 'Not found' });
    if (!canEditPost(req.user.role, req.user.sub, post.authorId)) {
      return reply.code(403).send({ error: 'Forbidden' });
    }
    await prisma.post.update({
      where: { id },
      data: { deletedAt: new Date(), status: PostStatus.ARCHIVED },
    });
    return { ok: true };
  });
}
