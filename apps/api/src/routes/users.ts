import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma, Role } from '../db.js';
import { atLeast, requireRole } from '../lib/rbac.js';
import { generateApiKey } from '../lib/apiKey.js';
import { emailField, idParam } from '../lib/schemas.js';

const roleEnum = z.enum(Role);

// True when removing/demoting `id` would leave zero SUPER_ADMINs in the system.
async function isLastSuperAdmin(id: string): Promise<boolean> {
  const others = await prisma.user.count({ where: { role: Role.SUPER_ADMIN, NOT: { id } } });
  return others === 0;
}

export async function userRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  // List users visible to EDITOR+ (they need to see authors for content review)
  app.get('/', { preHandler: [requireRole(Role.EDITOR)] }, async () => {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    return { data: users };
  });

  // Create user SUPER_ADMIN only. This is the only path to new accounts
  // after the first-run bootstrap as there is no public registration.
  app.post('/', { preHandler: [requireRole(Role.SUPER_ADMIN)] }, async (req, reply) => {
    const body = z
      .object({
        email: emailField,
        name: z.string().min(1).max(100),
        password: z.string().min(8).max(200),
        role: roleEnum,
      })
      .parse(req.body);

    // Audit trail when one SUPER_ADMIN grants the same role to another.
    if (body.role === Role.SUPER_ADMIN) {
      req.log.warn(
        { actor: req.user.sub, target: body.email },
        'super-admin granting SUPER_ADMIN role to new user',
      );
    }

    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) return reply.code(409).send({ error: 'Email in use' });

    const user = await prisma.user.create({
      data: {
        email: body.email,
        name: body.name,
        passwordHash: await bcrypt.hash(body.password, 10),
        role: body.role,
      },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
    return reply.code(201).send({ data: user });
  });

  // Change a user's role for SUPER_ADMIN only. Cannot demote yourself if you are
  // the last super-admin (prevents lockout).
  app.patch('/:id/role', { preHandler: [requireRole(Role.SUPER_ADMIN)] }, async (req, reply) => {
    const { id } = idParam.parse(req.params);
    const { role } = z.object({ role: roleEnum }).parse(req.body);

    if (id === req.user.sub && role !== Role.SUPER_ADMIN && (await isLastSuperAdmin(id))) {
      return reply.code(400).send({ error: 'Cannot demote the last super admin' });
    }

    const user = await prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, email: true, name: true, role: true },
    });
    return reply.send({ data: user });
  });

  // Delete user — SUPER_ADMIN only. Same anti-lockout rule.
  app.delete('/:id', { preHandler: [requireRole(Role.SUPER_ADMIN)] }, async (req, reply) => {
    const { id } = idParam.parse(req.params);
    if (id === req.user.sub) return reply.code(400).send({ error: 'Cannot delete yourself' });

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return reply.code(404).send({ error: 'Not found' });
    if (target.role === Role.SUPER_ADMIN && (await isLastSuperAdmin(id))) {
      return reply.code(400).send({ error: 'Cannot delete the last super admin' });
    }

    // Posts created by this user remain (FK is required). Re-assign to caller.
    await prisma.post.updateMany({ where: { authorId: id }, data: { authorId: req.user.sub } });
    await prisma.media.updateMany({
      where: { uploadedById: id },
      data: { uploadedById: req.user.sub },
    });
    await prisma.apiKey.deleteMany({ where: { ownerId: id } });
    await prisma.user.delete({ where: { id } });
    return { ok: true };
  });

  // API keys for the headless consumer (your personal site).
  // Each user manages their own keys.
  app.get('/me/api-keys', async (req) => {
    const keys = await prisma.apiKey.findMany({
      where: { ownerId: req.user.sub },
      select: {
        id: true,
        name: true,
        prefix: true,
        lastUsedAt: true,
        revokedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return { data: keys };
  });

  app.post('/me/api-keys', async (req, reply) => {
    // Only AUTHOR+ should mint API keys. Contributors don't publish, so don't
    // need a key for the personal site to read drafts.
    const role = req.user.role;
    if (!atLeast(role, Role.AUTHOR)) {
      return reply.code(403).send({ error: 'Insufficient role to create API keys' });
    }
    const { name } = z.object({ name: z.string().min(1) }).parse(req.body);
    const { plaintext, prefix, hash } = generateApiKey();
    const key = await prisma.apiKey.create({
      data: { name, prefix, keyHash: hash, ownerId: req.user.sub },
    });
    return reply.code(201).send({ id: key.id, name: key.name, prefix, key: plaintext });
  });

  app.delete('/me/api-keys/:id', async (req, reply) => {
    const { id } = idParam.parse(req.params);
    const key = await prisma.apiKey.findUnique({ where: { id } });
    if (!key || key.ownerId !== req.user.sub) return reply.code(404).send({ error: 'Not found' });
    await prisma.apiKey.update({ where: { id }, data: { revokedAt: new Date() } });
    return { ok: true };
  });
}
