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

// `*` with credentialed requests lets any site read authenticated responses; ban it in prod.
const corsAllowAny = corsOrigins.includes('*');
if (isProd && corsAllowAny) {
  throw new Error('CORS_ORIGINS must list explicit origins in production; "*" is not allowed');
}

// request.ip buckets the rate limiter, so X-Forwarded-For is only trustworthy behind
// a proxy we control — opt in explicitly. A numeric hop count compiles to a predicate
// (the type no longer exposes bare numbers, though proxy-addr still honours them).
type TrustProxy = boolean | string | ((address: string, hop: number) => boolean);

function parseTrustProxy(raw: string | undefined): TrustProxy {
  if (!raw) return false;
  const v = raw.trim();
  if (v === 'true') return true;
  if (v === 'false' || v === '') return false;
  const n = Number(v);
  if (Number.isInteger(n) && n >= 0) return (_address, hop) => hop < n; // trust n hops
  return v; // IP / CIDR list, e.g. "10.0.0.0/8,127.0.0.1"
}

export const config = {
  // API_PORT/API_HOST are the root .env names (bare PORT/HOST collide with the dashboard);
  // the unprefixed pair is kept as a fallback for platforms that inject PORT.
  port: Number(process.env.API_PORT ?? process.env.PORT ?? 4000),
  host: process.env.API_HOST ?? process.env.HOST ?? '0.0.0.0',
  isProd,
  jwtSecret,
  jwtIssuer: process.env.JWT_ISSUER ?? 'czy-blog',
  jwtAudience: process.env.JWT_AUDIENCE ?? 'czy-blog-api',
  // bcrypt work factor: OWASP floor is 10; 12 is the modern default.
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
