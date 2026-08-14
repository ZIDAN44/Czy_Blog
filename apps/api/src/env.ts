// The repo-root `.env` is the single source of truth for every app in the
// workspace. Importing this module loads it before any `process.env` read.
//
// Plain `dotenv/config` resolves `.env` against `process.cwd()`, which is
// `apps/api` under `npm --workspace`. We resolve against this module's own
// location instead, so it works the same from `src/` (tsx) and `dist/` (node)
// — both sit two directories below `apps/`, three below the repo root.
//
// Real environment variables always win: dotenv never overwrites what is
// already set, so Compose's `env_file` / `environment` and CI secrets take
// precedence, and the lookup is a harmless no-op inside the container image
// (there is no `.env` there).
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadDotenv } from 'dotenv';

const here = path.dirname(fileURLToPath(import.meta.url));

export const ENV_FILE = path.resolve(here, '..', '..', '..', '.env');

loadDotenv({ path: ENV_FILE, quiet: true });
