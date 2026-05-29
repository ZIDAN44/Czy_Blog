import { z } from 'zod';
import { PostStatus, Prisma } from '../db.js';

export function publishedPostWhere(): Prisma.PostWhereInput {
  return {
    status: PostStatus.PUBLISHED,
    deletedAt: null,
    publishedAt: { lte: new Date() },
  };
}

export function paginationSchema(opts: { maxLimit: number; defaultLimit: number }) {
  return z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(opts.maxLimit).default(opts.defaultLimit),
  });
}

export function paginated(total: number, page: number, limit: number) {
  return { page, limit, total, pages: Math.ceil(total / limit) };
}
