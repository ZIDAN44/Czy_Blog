// Loads the repo-root `.env` (shared by every app) before any process.env read.
// Resolved against this module's location, not cwd, so it works from src/ (tsx)
// and dist/ (node) alike. Real env vars always win — dotenv never overwrites, so
// Compose/CI secrets take precedence and it's a no-op in the container image.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadDotenv } from 'dotenv';

const here = path.dirname(fileURLToPath(import.meta.url));

const ENV_FILE = path.resolve(here, '..', '..', '..', '.env');

loadDotenv({ path: ENV_FILE, quiet: true });
