import path from 'node:path';
import { config as loadDotenv } from 'dotenv';

// Next only auto-loads `.env` from this app's own directory. The workspace
// keeps a single `.env` at the repo root, so load that here — next.config is
// evaluated before `next dev` / `next build` / `next start` read env.
// dotenv never overwrites an already-set variable, so Compose's `env_file`
// and the container image's own `ENV` defaults still win.
loadDotenv({ path: path.resolve(import.meta.dirname, '..', '..', '.env'), quiet: true });

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  // The shared design system ships TypeScript source; Next compiles it with the app.
  transpilePackages: ['@czyblog/ui'],
  outputFileTracingRoot: path.resolve(import.meta.dirname, '..', '..'),
};

export default nextConfig;
