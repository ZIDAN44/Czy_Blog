import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/index.js';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

export * from './generated/prisma/index.js';

export const prisma = new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'production' ? ['error'] : ['warn', 'error'],
});
