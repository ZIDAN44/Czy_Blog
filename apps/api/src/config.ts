import 'dotenv/config';

function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  host: process.env.HOST ?? '0.0.0.0',
  jwtSecret: required('JWT_SECRET', 'dev-jwt-secret-change-me'),
  databaseUrl: required('DATABASE_URL'),
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  publicSiteUrl: process.env.PUBLIC_SITE_URL ?? 'http://localhost:4000',
  uploadDir: process.env.UPLOAD_DIR ?? './uploads',
  publicUploadBaseUrl: process.env.PUBLIC_UPLOAD_BASE_URL ?? 'http://localhost:4000/uploads',
};
