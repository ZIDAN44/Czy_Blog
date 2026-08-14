import './env.js';

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

const DEV_JWT_SECRET = 'dev-jwt-secret-change-me';
const isProd = process.env.NODE_ENV === 'production';
const jwtSecret = process.env.JWT_SECRET ?? (isProd ? '' : DEV_JWT_SECRET);
if (isProd) {
  if (!jwtSecret || jwtSecret === DEV_JWT_SECRET) {
    throw new Error('JWT_SECRET must be set to a strong, unique value in production');
  }
  if (jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters in production');
  }
}

const corsOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

// `*` combined with credentialed requests is what turns a permissive CORS
// policy into a real vulnerability: the browser is told any site may read
// authenticated responses. Refuse it outright in production.
const corsAllowAny = corsOrigins.includes('*');
if (isProd && corsAllowAny) {
  throw new Error('CORS_ORIGINS must list explicit origins in production; "*" is not allowed');
}

// `request.ip` is what the rate limiter buckets on. It only reflects the real
// client when we are actually behind a proxy we control — otherwise any client
// can forge X-Forwarded-For and hand itself an unlimited number of buckets.
// Default off, and require an explicit opt-in describing the trusted hops.
function parseTrustProxy(raw: string | undefined): boolean | string | number {
  if (!raw) return false;
  const v = raw.trim();
  if (v === 'true') return true;
  if (v === 'false' || v === '') return false;
  const n = Number(v);
  if (Number.isInteger(n) && n >= 0) return n; // number of trusted hops
  return v; // IP / CIDR list, e.g. "10.0.0.0/8,127.0.0.1"
}

export const config = {
  // `API_PORT`/`API_HOST` are the names used in the shared root `.env`; a bare
  // `PORT`/`HOST` would collide with the dashboard, which reads those too.
  // The unprefixed pair is still honoured as a fallback for platforms (Heroku,
  // Fly, the container image) that inject `PORT` on their own.
  port: Number(process.env.API_PORT ?? process.env.PORT ?? 4000),
  host: process.env.API_HOST ?? process.env.HOST ?? '0.0.0.0',
  isProd,
  jwtSecret,
  jwtIssuer: process.env.JWT_ISSUER ?? 'czy-blog',
  jwtAudience: process.env.JWT_AUDIENCE ?? 'czy-blog-api',
  // OWASP's current password-storage guidance for bcrypt is a work factor of
  // 10 as a floor; 12 is the practical default on modern hardware.
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS ?? 12),
  databaseUrl: required('DATABASE_URL'),
  corsOrigins,
  corsAllowAny,
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY),
  publicSiteUrl: process.env.PUBLIC_SITE_URL ?? 'http://localhost:3000',
  uploadDir: process.env.UPLOAD_DIR ?? './uploads',
  publicUploadBaseUrl: process.env.PUBLIC_UPLOAD_BASE_URL ?? 'http://localhost:4000/uploads',
  maxUploadBytes: Number(process.env.MAX_UPLOAD_BYTES ?? 10 * 1024 * 1024),
  mediaCleanupIntervalHours: Number(process.env.MEDIA_CLEANUP_INTERVAL_HOURS ?? 24),
};
