import path from 'node:path';
import { config as loadDotenv } from 'dotenv';

// Next only auto-loads `.env` from this app's own directory. The workspace keeps
// a single `.env` at the repo root, so load that here. dotenv never overwrites an
// already-set variable, so Compose's `env_file` and container `ENV` defaults win.
loadDotenv({ path: path.resolve(import.meta.dirname, '..', '..', '.env'), quiet: true });

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  outputFileTracingRoot: path.resolve(import.meta.dirname, '..', '..'),
};

export default nextConfig;
