import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma, Prisma, Role } from '../db.js';
import { config } from '../config.js';
import { atLeast, requireRole } from '../lib/rbac.js';
import { generateApiKey } from '../lib/apiKey.js';
import { emailField, idParam, passwordField } from '../lib/schemas.js';

const roleEnum = z.enum(Role);

// Transaction callbacks return either the value or the HTTP failure the route
// should render, so a guard can abort the transaction without throwing.
type Denied = { denied: { status: number; message: string } };
type Outcome<T> = Denied | { value: T };

function isDenied<T>(o: Outcome<T>): o is Denied {
  return 'denied' in o;
}

/**
 * The anti-lockout invariant: the system must never be left without a
 * SUPER_ADMIN. Both the demote and the delete path need it, and both must run
 * it inside their own serializable transaction — otherwise two concurrent
 * removals each see the other super admin and both succeed. Stating the query
 * once keeps the two paths from drifting apart.
 */
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

  // Change a user's role for SUPER_ADMIN only. The system must never be left
  // without a SUPER_ADMIN, so the "is anyone else left" check and the write
  // have to happen atomically — otherwise two concurrent demotions each see
  // the other super-admin and both succeed.
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

  // Delete user — SUPER_ADMIN only. Same anti-lockout rule.
  app.delete('/:id', { preHandler: [requireRole(Role.SUPER_ADMIN)] }, async (req, reply) => {
    const { id } = idParam.parse(req.params);
    if (id === req.user.sub) return reply.code(400).send({ error: 'Cannot delete yourself' });

    // Re-parenting posts and media, dropping keys and deleting the row is one
    // logical operation: a failure partway through would strand content on a
    // user id that no longer exists (or delete the user's keys but not the user).
    const result = await prisma.$transaction(
      async (tx): Promise<Outcome<true>> => {
        const target = await tx.user.findUnique({ where: { id }, select: { role: true } });
        if (!target) return { denied: { status: 404, message: 'Not found' } };

        if (target.role === Role.SUPER_ADMIN && !(await hasAnotherSuperAdmin(tx, id))) {
          return { denied: { status: 400, message: 'Cannot delete the last super admin' } };
        }

        // Posts created by this user remain (FK is required). Re-assign to caller.
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
    const { name } = z.object({ name: z.string().trim().min(1).max(100) }).parse(req.body);

    // An unbounded number of live keys per user is an unbounded number of
    // credentials to leak; cap it.
    const live = await prisma.apiKey.count({ where: { ownerId: req.user.sub, revokedAt: null } });
    if (live >= 20) {
      return reply.code(409).send({ error: 'Too many active API keys; revoke one first' });
    }

    const { plaintext, prefix, hash } = generateApiKey();
    const key = await prisma.apiKey.create({
      data: { name, prefix, keyHash: hash, ownerId: req.user.sub },
    });
    // `plaintext` is returned exactly once and never stored.
    return reply.code(201).send({ id: key.id, name: key.name, prefix, key: plaintext });
  });

  app.delete('/me/api-keys/:id', async (req, reply) => {
    const { id } = idParam.parse(req.params);
    // Scope the write to the owner so a guessed id cannot revoke someone
    // else's key, and so the lookup and the update can't race.
    const { count } = await prisma.apiKey.updateMany({
      where: { id, ownerId: req.user.sub, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (count === 0) return reply.code(404).send({ error: 'Not found' });
    return { ok: true };
  });
}
