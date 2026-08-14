import { z } from 'zod';
import { PostStatus, Prisma } from '../db.js';

export function publishedPostWhere(): Prisma.PostWhereInput {
  return {
    status: PostStatus.PUBLISHED,
    deletedAt: null,
    publishedAt: { lte: new Date() },
  };
}

// Postgres still walks every row it skips, so an unbounded `page` turns a
// cheap query into a full scan. 10k pages is far past any real reader.
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

// The offset maths belongs next to the schema that produced `page`/`limit`, so
// the 1-based page contract is stated once rather than in every handler.
export function pageArgs(q: { page: number; limit: number }): { skip: number; take: number } {
  return { skip: (q.page - 1) * q.limit, take: q.limit };
}
