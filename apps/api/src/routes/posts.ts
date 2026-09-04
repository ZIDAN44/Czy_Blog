import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma, PostStatus, Role, Prisma } from '../db.js';
import { toSlug, uniquePostSlug } from '../lib/slug.js';
import { canEditPost, canManageTaxonomy, coerceStatus } from '../lib/rbac.js';
import { serializePost } from '../lib/serialize.js';
import { pageArgs, paginated, paginationSchema, publishedPostWhere } from '../lib/queries.js';
import { httpUrlField, idParam, slugField, slugParam } from '../lib/schemas.js';
import { blockDocSchema } from '../lib/content.js';
import { purgePostMedia } from '../lib/mediaCleanup.js';

const postInclude = {
  author: { select: { id: true, name: true, avatarUrl: true, bio: true } },
  category: true,
  tags: { include: { tag: true } },
} as const;

// Each tag is a row plus a possible insert; cap it before it's a write-amplification vector.
const MAX_TAGS_PER_POST = 25;

// Search is an unanchored LIKE over two columns; cap the needle so it can't be made expensive.
const MAX_SEARCH_LENGTH = 100;

const createSchema = z.object({
  title: z.string().trim().min(1).max(200),
  excerpt: z.string().max(500).optional(),
  content: blockDocSchema,
  coverImageUrl: httpUrlField.optional(),
  categorySlug: z.string().trim().min(1).max(96).optional(),
  tagSlugs: z.array(z.string().trim().min(1).max(96)).max(MAX_TAGS_PER_POST).optional(),
  status: z.enum(PostStatus).optional(),
  scheduledFor: z.iso.datetime().optional(),
});

const updateSchema = createSchema.partial();

function isFutureDate(d: Date | null | undefined): d is Date {
  return !!d && d.getTime() > Date.now();
}

// Already validated by blockDocSchema; this just restates the type for Prisma's JSON column.
function asJson(doc: unknown): Prisma.InputJsonValue {
  return doc as Prisma.InputJsonValue;
}

// Only EDITOR+ may implicitly create a category; lower roles must reference an
// existing slug, so they can't mint taxonomy through the post-create back door.
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
  // upsert collapses a concurrent same-slug create into a single winner.
  const cat = await prisma.category.upsert({
    where: { slug },
    update: {},
    create: { slug, name },
  });
  return cat.id;
}

async function resolveTagIds(rawSlugs: string[], role: Role): Promise<string[]> {
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

export async function publicPostRoutes(app: FastifyInstance) {
  app.get('/', async (req, reply) => {
    const q = paginationSchema({ maxLimit: 50, defaultLimit: 10 })
      .extend({
        tag: slugField.optional(),
        category: slugField.optional(),
        q: z.string().trim().min(1).max(MAX_SEARCH_LENGTH).optional(),
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
        ...pageArgs(q),
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
    // Fire-and-forget: a failed view bump must not fail the read.
    prisma.post
      .update({ where: { id: post.id }, data: { viewCount: { increment: 1 } } })
      .catch((err) => req.log.warn({ err }, 'failed to increment view count'));
    return reply.send({ data: serializePost(post) });
  });
}

export async function adminPostRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  app.get('/', async (req) => {
    const q = paginationSchema({ maxLimit: 100, defaultLimit: 20 })
      .extend({
        status: z.enum(PostStatus).optional(),
        mine: z.stringbool().optional(),
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
        ...pageArgs(q),
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

    // SCHEDULED needs a future scheduledFor, else the next tick makes it an instant-publish back door.
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
        content: asJson(body.content),
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
    if (body.content) data.content = asJson(body.content);
    if (body.coverImageUrl !== undefined) data.coverImageUrl = body.coverImageUrl;

    // Status after this request; decides whether a past scheduledFor is allowed.
    let effectiveStatus = post.status;
    if (body.status) {
      const target = coerceStatus(req.user.role, body.status);
      if (target === null) {
        return reply.code(403).send({ error: 'Not allowed to set that status' });
      }
      data.status = target;
      effectiveStatus = target;
      if (target === PostStatus.PUBLISHED && !post.publishedAt) data.publishedAt = new Date();
    }

    if (body.scheduledFor !== undefined) {
      data.scheduledFor = body.scheduledFor ? new Date(body.scheduledFor) : null;
    }

    if (effectiveStatus === PostStatus.SCHEDULED) {
      // Whether newly SCHEDULED or already: a past scheduledFor would publish on the next tick.
      const raw = body.scheduledFor === undefined ? post.scheduledFor : body.scheduledFor;
      if (!isFutureDate(raw ? new Date(raw) : null)) {
        return reply.code(400).send({ error: 'scheduledFor must be in the future' });
      }
    }

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
    // Reclaim this post's media; best-effort, the sweep catches leftovers.
    await purgePostMedia(post, req.log).catch((err) => req.log.error(err));
    return { ok: true };
  });
}
