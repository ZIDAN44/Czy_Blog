import { z } from 'zod';
import { PostStatus, Prisma } from '../db.js';

export function publishedPostWhere(): Prisma.PostWhereInput {
  return {
    status: PostStatus.PUBLISHED,
    deletedAt: null,
    publishedAt: { lte: new Date() },
  };
}

// Postgres walks every skipped row, so an unbounded page becomes a full scan.
const MAX_PAGE = 10_000;

export function paginationSchema(opts: { maxLimit: number; defaultLimit: number }) {
  return z.object({
    page: z.coerce.number().int().min(1).max(MAX_PAGE).default(1),
    limit: z.coerce.number().int().min(1).max(opts.maxLimit).default(opts.defaultLimit),
  });
}

export function paginated(total: number, page: number, limit: number) {
  return { page, limit, total, pages: Math.ceil(total / limit) };
}

// Offset maths lives next to its schema so the 1-based page contract is stated once.
export function pageArgs(q: { page: number; limit: number }): { skip: number; take: number } {
  return { skip: (q.page - 1) * q.limit, take: q.limit };
}
