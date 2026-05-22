import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/index.js';

// Prisma 7 no longer talks to the database directly — you must supply a
// driver adapter. For PostgreSQL we use @prisma/adapter-pg, which wraps the
// `pg` driver. The connection string still comes from DATABASE_URL.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

// Re-export everything from the generated client so route/lib files import
// from one place (`../db.js`) instead of '@prisma/client'. In Prisma 7 the
// generated client is the canonical source for types and enums.
export * from './generated/prisma/index.js';

export const prisma = new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'production' ? ['error'] : ['warn', 'error'],
});
