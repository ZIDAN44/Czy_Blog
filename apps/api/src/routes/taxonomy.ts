import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma, Role } from '../db.js';
import { requireRole } from '../lib/rbac.js';
import { toSlug } from '../lib/slug.js';
import { idParam } from '../lib/schemas.js';

const categorySchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(500).optional(),
});

export async function publicTaxonomyRoutes(app: FastifyInstance) {
  app.get('/categories', async () => {
    const data = await prisma.category.findMany({
      select: { id: true, slug: true, name: true, description: true },
      orderBy: { name: 'asc' },
    });
    return { data };
  });
  app.get('/tags', async () => {
    const data = await prisma.tag.findMany({
      select: { id: true, slug: true, name: true },
      orderBy: { name: 'asc' },
    });
    return { data };
  });
}

export async function adminTaxonomyRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  app.post('/categories', { preHandler: [requireRole(Role.EDITOR)] }, async (req, reply) => {
    const body = categorySchema.parse(req.body);
    const slug = toSlug(body.name);

    const existing = await prisma.category.findUnique({ where: { slug } });
    if (existing) return reply.code(409).send({ error: 'Category already exists' });

    const cat = await prisma.category.create({
      data: { slug, name: body.name, description: body.description },
    });
    return reply.code(201).send({ data: cat });
  });

  app.delete('/categories/:id', { preHandler: [requireRole(Role.EDITOR)] }, async (req, reply) => {
    const { id } = idParam.parse(req.params);

    // categoryId is a nullable FK with no cascade, so detach posts first in the
    // same tx or the delete fails the constraint.
    const found = await prisma.$transaction(async (tx) => {
      const category = await tx.category.findUnique({ where: { id }, select: { id: true } });
      if (!category) return false;
      await tx.post.updateMany({ where: { categoryId: id }, data: { categoryId: null } });
      await tx.category.delete({ where: { id } });
      return true;
    });

    if (!found) return reply.code(404).send({ error: 'Not found' });
    return { ok: true };
  });
}
