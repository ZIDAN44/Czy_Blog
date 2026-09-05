import './env.js';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

// Applies pending SQL migrations at boot, replacing `prisma migrate deploy`.
const MIGRATIONS_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'prisma',
  'migrations',
);

// Fixed key so concurrent replicas serialize on one Postgres advisory lock.
const LOCK_KEY = 4966821;

type Logger = { info: (msg: string) => void; error: (msg: string) => void };
const consoleLogger: Logger = {
  info: (m) => console.log(`[migrate] ${m}`),
  error: (m) => console.error(`[migrate] ${m}`),
};

// Mark as applied anything `prisma migrate dev/deploy` ran directly against the
// database (it records in `_prisma_migrations`), so we never try to re-run it.
async function adoptPrismaHistory(client: pg.Client): Promise<void> {
  const legacy = await client.query<{ t: string | null }>(
    "SELECT to_regclass('public._prisma_migrations') AS t",
  );
  if (!legacy.rows[0].t) return;
  await client.query(
    `INSERT INTO "_schema_migrations" (name, applied_at)
     SELECT migration_name, COALESCE(finished_at, now())
     FROM "_prisma_migrations"
     WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL
     ON CONFLICT (name) DO NOTHING`,
  );
}

export async function migrate(log: Logger = consoleLogger): Promise<void> {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query('SELECT pg_advisory_lock($1)', [LOCK_KEY]);
    await client.query(
      `CREATE TABLE IF NOT EXISTS "_schema_migrations" (
         name text PRIMARY KEY,
         applied_at timestamptz NOT NULL DEFAULT now()
       )`,
    );
    await adoptPrismaHistory(client);

    const applied = new Set(
      (await client.query<{ name: string }>('SELECT name FROM "_schema_migrations"')).rows.map(
        (r) => r.name,
      ),
    );
    const pending = (await readdir(MIGRATIONS_DIR, { withFileTypes: true }))
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort()
      .filter((name) => !applied.has(name));

    if (pending.length === 0) {
      log.info('schema up to date');
      return;
    }

    for (const name of pending) {
      const sql = await readFile(path.join(MIGRATIONS_DIR, name, 'migration.sql'), 'utf8');
      log.info(`applying ${name}`);
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO "_schema_migrations" (name) VALUES ($1)', [name]);
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`failed on ${name}: ${(err as Error).message}`, { cause: err });
      }
    }
    log.info(`applied ${pending.length} migration(s)`);
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [LOCK_KEY]).catch(() => {});
    await client.end();
  }
}
