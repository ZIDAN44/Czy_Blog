import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma, Prisma, Role } from '../db.js';
import { config } from '../config.js';
import { atLeast, requireRole } from '../lib/rbac.js';
import { generateApiKey } from '../lib/apiKey.js';
import { emailField, idParam, passwordField } from '../lib/schemas.js';

const roleEnum = z.enum(Role);

// Tx callbacks return the value or the HTTP failure to render, so a guard can abort without throwing.
type Denied = { denied: { status: number; message: string } };
type Outcome<T> = Denied | { value: T };

function isDenied<T>(o: Outcome<T>): o is Denied {
  return 'denied' in o;
}

// Anti-lockout: never leave the system without a SUPER_ADMIN. Demote and delete
// both call this inside a serializable tx, else two concurrent removals each see
// the other super admin and both succeed.
async function hasAnotherSuperAdmin(tx: Prisma.TransactionClient, excludeId: string) {
  const others = await tx.user.count({ where: { role: Role.SUPER_ADMIN, NOT: { id: excludeId } } });
  return others > 0;
}

const createUserSchema = z.object({
  email: emailField,
  name: z.string().trim().min(1).max(100),
  password: passwordField,
  role: roleEnum,
});

export async function userRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  // EDITOR+ need to see authors for content review.
  app.get('/', { preHandler: [requireRole(Role.EDITOR)] }, async () => {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    return { data: users };
  });

  // SUPER_ADMIN only — the sole path to new accounts after bootstrap (no public registration).
  app.post('/', { preHandler: [requireRole(Role.SUPER_ADMIN)] }, async (req, reply) => {
    const body = createUserSchema.parse(req.body);

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
        passwordHash: await bcrypt.hash(body.password, config.bcryptRounds),
        role: body.role,
      },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
    return reply.code(201).send({ data: user });
  });

  // SUPER_ADMIN only; the last-super-admin check and the write must be atomic (see hasAnotherSuperAdmin).
  app.patch('/:id/role', { preHandler: [requireRole(Role.SUPER_ADMIN)] }, async (req, reply) => {
    const { id } = idParam.parse(req.params);
    const { role } = z.object({ role: roleEnum }).parse(req.body);

    const result = await prisma.$transaction(
      async (tx): Promise<Outcome<{ id: string; email: string; name: string; role: Role }>> => {
        const target = await tx.user.findUnique({ where: { id }, select: { role: true } });
        if (!target) return { denied: { status: 404, message: 'Not found' } };

        const losingSuperAdmin = target.role === Role.SUPER_ADMIN && role !== Role.SUPER_ADMIN;
        if (losingSuperAdmin && !(await hasAnotherSuperAdmin(tx, id))) {
          return { denied: { status: 400, message: 'Cannot demote the last super admin' } };
        }

        const user = await tx.user.update({
          where: { id },
          data: { role },
          select: { id: true, email: true, name: true, role: true },
        });
        return { value: user };
      },
      { isolationLevel: 'Serializable' },
    );

    if (isDenied(result)) {
      return reply.code(result.denied.status).send({ error: result.denied.message });
    }
    return reply.send({ data: result.value });
  });

  // SUPER_ADMIN only; same anti-lockout rule.
  app.delete('/:id', { preHandler: [requireRole(Role.SUPER_ADMIN)] }, async (req, reply) => {
    const { id } = idParam.parse(req.params);
    if (id === req.user.sub) return reply.code(400).send({ error: 'Cannot delete yourself' });

    // Re-parent posts/media, drop keys, delete the row — one tx, so a partial failure
    // can't strand content on a missing user id.
    const result = await prisma.$transaction(
      async (tx): Promise<Outcome<true>> => {
        const target = await tx.user.findUnique({ where: { id }, select: { role: true } });
        if (!target) return { denied: { status: 404, message: 'Not found' } };

        if (target.role === Role.SUPER_ADMIN && !(await hasAnotherSuperAdmin(tx, id))) {
          return { denied: { status: 400, message: 'Cannot delete the last super admin' } };
        }

        // Posts have a required author FK, so re-assign to the caller rather than delete.
        await tx.post.updateMany({ where: { authorId: id }, data: { authorId: req.user.sub } });
        await tx.media.updateMany({
          where: { uploadedById: id },
          data: { uploadedById: req.user.sub },
        });
        await tx.apiKey.deleteMany({ where: { ownerId: id } });
        await tx.user.delete({ where: { id } });
        return { value: true };
      },
      { isolationLevel: 'Serializable' },
    );

    if (isDenied(result)) {
      return reply.code(result.denied.status).send({ error: result.denied.message });
    }
    return { ok: true };
  });

  // API keys for the headless consumer (the personal site); each user manages their own.
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
    // Only AUTHOR+ mint keys; contributors don't publish, so need none.
    const role = req.user.role;
    if (!atLeast(role, Role.AUTHOR)) {
      return reply.code(403).send({ error: 'Insufficient role to create API keys' });
    }
    const { name } = z.object({ name: z.string().trim().min(1).max(100) }).parse(req.body);

    // Cap live keys per user — each is one more credential that can leak.
    const live = await prisma.apiKey.count({ where: { ownerId: req.user.sub, revokedAt: null } });
    if (live >= 20) {
      return reply.code(409).send({ error: 'Too many active API keys; revoke one first' });
    }

    const { plaintext, prefix, hash } = generateApiKey();
    const key = await prisma.apiKey.create({
      data: { name, prefix, keyHash: hash, ownerId: req.user.sub },
    });
    // plaintext is returned once and never stored.
    return reply.code(201).send({ id: key.id, name: key.name, prefix, key: plaintext });
  });

  app.delete('/me/api-keys/:id', async (req, reply) => {
    const { id } = idParam.parse(req.params);
    // Scope to the owner so a guessed id can't revoke another's key, and lookup+update can't race.
    const { count } = await prisma.apiKey.updateMany({
      where: { id, ownerId: req.user.sub, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (count === 0) return reply.code(404).send({ error: 'Not found' });
    return { ok: true };
  });
}
