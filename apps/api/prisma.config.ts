import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadDotenv } from 'dotenv';
import { defineConfig } from 'prisma/config';

loadDotenv({
  path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '.env'),
  quiet: true,
});

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
