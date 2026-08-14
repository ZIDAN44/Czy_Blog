import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import staticPlugin from '@fastify/static';
import multipart from '@fastify/multipart';
import path from 'node:path';
import fs from 'node:fs';
import { ZodError, z } from 'zod';
import { config } from './config.js';
import { Prisma } from './db.js';
import authPlugin from './plugins/auth.js';
import { authRoutes } from './routes/auth.js';
import { userRoutes } from './routes/users.js';
import { adminPostRoutes, publicPostRoutes } from './routes/posts.js';
import { contentRoutes } from './routes/content.js';
import { mediaRoutes } from './routes/media.js';
import { adminTaxonomyRoutes, publicTaxonomyRoutes } from './routes/taxonomy.js';
import { rssRoutes } from './routes/rss.js';

// Prisma error code -> HTTP status. Without this every unique-constraint race
// or missing row surfaces as a 500 carrying Prisma's internal message.
const PRISMA_STATUS: Record<string, { status: number; message: string }> = {
  P2002: { status: 409, message: 'Already exists' },
  P2003: { status: 409, message: 'Referenced by other records' },
  P2025: { status: 404, message: 'Not found' },
};

export async function buildApp() {
  const app = Fastify({
    logger: {
      // Never let a bearer token or api key reach the log sink.
      redact: {
        paths: [
          'req.headers.authorization',
          'req.headers.cookie',
          'req.headers["x-api-key"]',
          'res.headers["set-cookie"]',
        ],
        censor: '[redacted]',
      },
    },
    trustProxy: config.trustProxy,
    bodyLimit: 1024 * 1024, // 1 MiB of JSON; uploads go through multipart
  });

  await app.register(helmet, {
    // The API serves JSON and uploaded images, never its own HTML, so the
    // strictest CSP applies. `crossOriginResourcePolicy` has to allow the
    // dashboard on another origin to display /uploads images.
    contentSecurityPolicy: {
      directives: {
        'default-src': ["'none'"],
        'img-src': ["'self'", 'data:'],
        'frame-ancestors': ["'none'"],
        'base-uri': ["'none'"],
        'form-action': ["'none'"],
      },
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginEmbedderPolicy: false,
    referrerPolicy: { policy: 'no-referrer' },
  });

  await app.register(cors, {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // same-origin / curl
      if (config.corsAllowAny || config.corsOrigins.includes(origin)) return cb(null, true);
      cb(null, false); // reply without CORS headers; the browser blocks it
    },
    // Credentialed responses must never be readable by an arbitrary origin.
    credentials: !config.corsAllowAny,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
    maxAge: 600,
  });

  await app.register(rateLimit, {
    max: 300,
    timeWindow: '1 minute',
    // No allowList: behind a proxy every request appears to come from the
    // proxy's address, so allow-listing loopback disables the limiter wholesale.
  });

  await app.register(multipart, {
    limits: {
      fileSize: config.maxUploadBytes,
      files: 1,
      fields: 10,
      fieldSize: 1024 * 100,
    },
  });

  fs.mkdirSync(config.uploadDir, { recursive: true });
  await app.register(
    async (instance) => {
      await instance.register(staticPlugin, {
        root: path.resolve(config.uploadDir),
        prefix: '/uploads/',
        index: false,
        dotfiles: 'deny',
        decorateReply: false,
        // Uploads are user-supplied bytes. Pin the sniffing behaviour so a file
        // that slips past upload validation still cannot execute as HTML.
        setHeaders: (reply) => {
          reply.header('X-Content-Type-Options', 'nosniff');
          reply.header('Content-Security-Policy', "default-src 'none'; sandbox");
          reply.header('Cross-Origin-Resource-Policy', 'cross-origin');
        },
      });
    },
    { logLevel: 'warn' },
  );

  await app.register(authPlugin);

  // These must be installed BEFORE the route plugins below. A child context
  // inherits the error handler its parent had at the moment it was created, so
  // setting one after `register()` leaves every route on Fastify's default
  // handler — which reported validation failures as 500s carrying the raw Zod
  // message instead of a 400.
  app.setNotFoundHandler(async (_req, reply) => reply.code(404).send({ error: 'Not found' }));

  app.setErrorHandler((err, req, reply) => {
    if (err instanceof ZodError) {
      return reply.code(400).send({ error: 'ValidationError', issues: z.flattenError(err) });
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      const mapped = PRISMA_STATUS[err.code];
      if (mapped) return reply.code(mapped.status).send({ error: mapped.message });
      req.log.error({ err }, 'prisma error');
      return reply.code(500).send({ error: 'Internal Server Error' });
    }

    const e = err as { statusCode?: number; message?: string };
    const status = e.statusCode ?? 500;
    if (status >= 500) {
      // Internal messages can carry query fragments, file paths and connection
      // strings. Log them, never ship them to the caller.
      req.log.error({ err }, 'request failed');
      return reply.code(status).send({ error: 'Internal Server Error' });
    }
    reply.code(status).send({ error: e.message || 'Request failed' });
  });

  app.get('/health', { logLevel: 'warn' }, async () => ({
    ok: true,
    time: new Date().toISOString(),
  }));

  await app.register(authRoutes, { prefix: '/api/v1/auth' });
  await app.register(userRoutes, { prefix: '/api/v1/users' });
  await app.register(publicPostRoutes, { prefix: '/api/v1/posts' });
  await app.register(adminPostRoutes, { prefix: '/api/v1/admin/posts' });
  await app.register(contentRoutes, { prefix: '/api/v1/content' });
  await app.register(mediaRoutes, { prefix: '/api/v1/media' });
  await app.register(publicTaxonomyRoutes, { prefix: '/api/v1' });
  await app.register(adminTaxonomyRoutes, { prefix: '/api/v1/admin' });
  await app.register(rssRoutes, { prefix: '/', logLevel: 'warn' });

  return app;
}
