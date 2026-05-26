import 'dotenv/config';

function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

const DEV_JWT_SECRET = 'dev-jwt-secret-change-me';
const isProd = process.env.NODE_ENV === 'production';
const jwtSecret = process.env.JWT_SECRET ?? (isProd ? '' : DEV_JWT_SECRET);
if (!jwtSecret || jwtSecret === DEV_JWT_SECRET) {
  if (isProd) {
    throw new Error('JWT_SECRET must be set to a strong, unique value in production');
  }
}
if (jwtSecret.length < 32 && isProd) {
  throw new Error('JWT_SECRET must be at least 32 characters in production');
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  host: process.env.HOST ?? '0.0.0.0',
  jwtSecret,
  databaseUrl: required('DATABASE_URL'),
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  publicSiteUrl: process.env.PUBLIC_SITE_URL ?? 'http://localhost:4000',
  uploadDir: process.env.UPLOAD_DIR ?? './uploads',
  publicUploadBaseUrl: process.env.PUBLIC_UPLOAD_BASE_URL ?? 'http://localhost:4000/uploads',
};
