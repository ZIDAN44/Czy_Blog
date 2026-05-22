import { Role } from '../db.js';
import type { FastifyReply, FastifyRequest } from 'fastify';

const RANK: Record<Role, number> = {
  CONTRIBUTOR: 1,
  AUTHOR: 2,
  EDITOR: 3,
  SUPER_ADMIN: 4,
};

export function atLeast(role: Role, min: Role): boolean {
  return RANK[role] >= RANK[min];
}

export function requireRole(min: Role) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    const user = req.user as { role?: Role } | undefined;
    if (!user?.role || !atLeast(user.role, min)) {
      return reply.code(403).send({ error: 'Forbidden' });
    }
  };
}

export function canEditPost(userRole: Role, userId: string, postAuthorId: string): boolean {
  if (atLeast(userRole, Role.EDITOR)) return true;
  if (userRole === Role.AUTHOR && userId === postAuthorId) return true;
  if (userRole === Role.CONTRIBUTOR && userId === postAuthorId) return true;
  return false;
}

export function canPublish(userRole: Role): boolean {
  return atLeast(userRole, Role.AUTHOR);
}
