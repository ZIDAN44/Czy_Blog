import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import staticPlugin from '@fastify/static';
import multipart from '@fastify/multipart';
import path from 'node:path';
import fs from 'node:fs';
import { ZodError, z } from 'zod';
import { config } from './config.js';
import authPlugin from './plugins/auth.js';
import { authRoutes } from './routes/auth.js';
import { userRoutes } from './routes/users.js';
import { adminPostRoutes, publicPostRoutes } from './routes/posts.js';
import { contentRoutes } from './routes/content.js';
import { mediaRoutes } from './routes/media.js';
import { adminTaxonomyRoutes, publicTaxonomyRoutes } from './routes/taxonomy.js';
import { rssRoutes } from './routes/rss.js';

export async function buildApp() {
  const app = Fastify({ logger: true });

  await app.register(cors, {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // same-origin / curl
      if (config.corsOrigins.includes(origin) || config.corsOrigins.includes('*'))
        return cb(null, true);
      cb(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  await app.register(rateLimit, {
    max: 300,
    timeWindow: '1 minute',
    allowList: ['127.0.0.1'],
  });

  await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } });

  fs.mkdirSync(config.uploadDir, { recursive: true });
  await app.register(
    async (instance) => {
      await instance.register(staticPlugin, {
        root: path.resolve(config.uploadDir),
        prefix: '/uploads/',
        decorateReply: false,
      });
    },
    { logLevel: 'warn' },
  );

  await app.register(authPlugin);

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

  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof ZodError) {
      return reply.code(400).send({ error: 'ValidationError', issues: z.flattenError(err) });
    }
    const e = err as { statusCode?: number; message?: string };
    const status = e.statusCode ?? 500;
    if (status >= 500) app.log.error(err);
    reply.code(status).send({ error: e.message || 'Internal Server Error' });
  });

  return app;
}
