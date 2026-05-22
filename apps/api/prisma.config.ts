import 'dotenv/config';
import path from 'node:path';
import { defineConfig } from 'prisma/config';

// Prisma 7 moves environment-bound config out of schema.prisma into here.
// The CLI uses `datasource.url` for `prisma migrate`, `prisma generate`, etc.
// The runtime PrismaClient gets its connection via the driver adapter
// (see src/db.ts) — these two paths must point at the same database.
export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  datasource: {
    url: process.env.DATABASE_URL!,
  },
});
