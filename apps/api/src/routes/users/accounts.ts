import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma, Role } from '../../db.js';
import { config } from '../../config.js';
import { requireRole } from '../../lib/rbac.js';
import { emailField, idParam, passwordField } from '../../lib/schemas.js';
import { deny, hasAnotherSuperAdmin, sendIfDenied, type Outcome } from './guards.js';

const roleEnum = z.enum(Role);

const createUserSchema = z.object({
  email: emailField,
  name: z.string().trim().min(1).max(100),
  password: passwordField,
  role: roleEnum,
});

const publicUser = { id: true, email: true, name: true, role: true, createdAt: true } as const;

async function listUsers() {
  const users = await prisma.user.findMany({ select: publicUser, orderBy: { createdAt: 'desc' } });
  return { data: users };
}

// The sole path to new accounts after bootstrap (no public registration).
async function createUser(req: FastifyRequest, reply: FastifyReply) {
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
    select: publicUser,
  });
  return reply.code(201).send({ data: user });
}

// The last-super-admin check and the write must be atomic (see hasAnotherSuperAdmin).
async function changeRole(req: FastifyRequest, reply: FastifyReply) {
  const { id } = idParam.parse(req.params);
  const { role } = z.object({ role: roleEnum }).parse(req.body);

  const result = await prisma.$transaction(
    async (tx): Promise<Outcome<{ id: string; email: string; name: string; role: Role }>> => {
      const target = await tx.user.findUnique({ where: { id }, select: { role: true } });
      if (!target) return deny(404, 'Not found');

      const losingSuperAdmin = target.role === Role.SUPER_ADMIN && role !== Role.SUPER_ADMIN;
      if (losingSuperAdmin && !(await hasAnotherSuperAdmin(tx, id))) {
        return deny(400, 'Cannot demote the last super admin');
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

  if (sendIfDenied(reply, result)) return reply;
  return reply.send({ data: result.value });
}

// Same anti-lockout rule. Re-parent posts/media, drop keys, delete the row — one
// tx, so a partial failure can't strand content on a missing user id.
async function deleteUser(req: FastifyRequest, reply: FastifyReply) {
  const { id } = idParam.parse(req.params);
  if (id === req.user.sub) return reply.code(400).send({ error: 'Cannot delete yourself' });
  const heirId = req.user.sub;

  const result = await prisma.$transaction(
    async (tx): Promise<Outcome<true>> => {
      const target = await tx.user.findUnique({ where: { id }, select: { role: true } });
      if (!target) return deny(404, 'Not found');
      if (target.role === Role.SUPER_ADMIN && !(await hasAnotherSuperAdmin(tx, id))) {
        return deny(400, 'Cannot delete the last super admin');
      }
      // Posts have a required author FK, so re-assign to the caller rather than delete.
      await tx.post.updateMany({ where: { authorId: id }, data: { authorId: heirId } });
      await tx.media.updateMany({ where: { uploadedById: id }, data: { uploadedById: heirId } });
      await tx.apiKey.deleteMany({ where: { ownerId: id } });
      await tx.user.delete({ where: { id } });
      return { value: true };
    },
    { isolationLevel: 'Serializable' },
  );

  if (sendIfDenied(reply, result)) return reply;
  return { ok: true };
}

export async function accountRoutes(app: FastifyInstance) {
  // EDITOR+ need to see authors for content review.
  app.get('/', { preHandler: [requireRole(Role.EDITOR)] }, listUsers);
  app.post('/', { preHandler: [requireRole(Role.SUPER_ADMIN)] }, createUser);
  app.patch('/:id/role', { preHandler: [requireRole(Role.SUPER_ADMIN)] }, changeRole);
  app.delete('/:id', { preHandler: [requireRole(Role.SUPER_ADMIN)] }, deleteUser);
}
