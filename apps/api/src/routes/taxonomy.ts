import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma, Role } from '../db.js';
import { requireRole } from '../lib/rbac.js';
import { toSlug } from '../lib/slug.js';

export async function publicTaxonomyRoutes(app: FastifyInstance) {
  app.get('/categories', async () => {
    const data = await prisma.category.findMany({ orderBy: { name: 'asc' } });
    return { data };
  });
  app.get('/tags', async () => {
    const data = await prisma.tag.findMany({ orderBy: { name: 'asc' } });
    return { data };
  });
}

export async function adminTaxonomyRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  app.post('/categories', { preHandler: [requireRole(Role.EDITOR)] }, async (req, reply) => {
    const body = z.object({ name: z.string().min(1), description: z.string().optional() }).parse(req.body);
    const slug = toSlug(body.name);
    const cat = await prisma.category.create({ data: { slug, name: body.name, description: body.description } });
    return reply.code(201).send(cat);
  });

  app.delete('/categories/:id', { preHandler: [requireRole(Role.EDITOR)] }, async (req) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    await prisma.category.delete({ where: { id } });
    return { ok: true };
  });
}
