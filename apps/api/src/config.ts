import './env.js';

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

// setInterval silently turns anything outside 1..2^31-1 ms (~596 h), or NaN, into 1 ms,
// so a typo would sweep media in a tight loop. Empty falls back to the default.
const MAX_TIMER_HOURS = Math.floor((2 ** 31 - 1) / 3_600_000);
function intervalHours(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0 || n > MAX_TIMER_HOURS) {
    throw new Error(`${name} must be a number of hours above 0 and at most ${MAX_TIMER_HOURS}`);
  }
  return n;
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

const s3Bucket = required('S3_BUCKET');
const s3Region = process.env.S3_REGION ?? 'us-east-1';
const s3Endpoint = process.env.S3_ENDPOINT?.trim() || undefined; // set ⇒ RustFS etc.

const apiPort = Number(process.env.API_PORT ?? process.env.PORT ?? 4000);
// Browser-facing base for image URLs: the API's /media route, not the bucket.
const mediaPublicBaseUrl = (
  process.env.MEDIA_PUBLIC_BASE_URL ?? `http://localhost:${apiPort}/media`
).replace(/\/+$/, '');

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
  port: apiPort,
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
  s3: {
    bucket: s3Bucket,
    region: s3Region,
    endpoint: s3Endpoint,
    // Path-style: default on for a custom endpoint (what self-hosted stores want).
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== 'false' && Boolean(s3Endpoint),
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? '',
  },
  media: {
    publicBaseUrl: mediaPublicBaseUrl,
  },
  maxUploadBytes: Number(process.env.MAX_UPLOAD_BYTES ?? 10 * 1024 * 1024),
  mediaCleanupIntervalHours: intervalHours('MEDIA_CLEANUP_INTERVAL_HOURS', 24),
};
