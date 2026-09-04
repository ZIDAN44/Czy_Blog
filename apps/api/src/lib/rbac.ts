import { PostStatus, Role } from '../db.js';
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

// Statuses a contributor may set on their own post; anything that publishes
// (direct or scheduled) is forbidden — they submit for review instead.
const CONTRIBUTOR_STATUSES: ReadonlySet<PostStatus> = new Set([
  PostStatus.DRAFT,
  PostStatus.PENDING_REVIEW,
  PostStatus.ARCHIVED,
]);

// AUTHOR can publish their own work, so they may also schedule and archive.
const AUTHOR_STATUSES: ReadonlySet<PostStatus> = new Set([
  PostStatus.DRAFT,
  PostStatus.PENDING_REVIEW,
  PostStatus.SCHEDULED,
  PostStatus.PUBLISHED,
  PostStatus.ARCHIVED,
]);

// Coerce a requested status to one the caller may set; null means reject.
export function coerceStatus(userRole: Role, requested: PostStatus): PostStatus | null {
  if (atLeast(userRole, Role.EDITOR)) return requested;
  if (userRole === Role.AUTHOR) {
    return AUTHOR_STATUSES.has(requested) ? requested : null;
  }
  // CONTRIBUTOR: silently downgrade publish/schedule attempts to review.
  if (requested === PostStatus.PUBLISHED || requested === PostStatus.SCHEDULED) {
    return PostStatus.PENDING_REVIEW;
  }
  return CONTRIBUTOR_STATUSES.has(requested) ? requested : null;
}

export function canManageTaxonomy(userRole: Role): boolean {
  return atLeast(userRole, Role.EDITOR);
}
