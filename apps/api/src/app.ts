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
  });

  await app.register(rateLimit, {
    max: 300,
    timeWindow: '1 minute',
    allowList: ['127.0.0.1'],
  });

  await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } });

  fs.mkdirSync(config.uploadDir, { recursive: true });
  await app.register(staticPlugin, {
    root: path.resolve(config.uploadDir),
    prefix: '/uploads/',
    decorateReply: false,
  });

  await app.register(authPlugin);

  app.get('/health', async () => ({ ok: true, time: new Date().toISOString() }));

  await app.register(authRoutes, { prefix: '/api/v1/auth' });
  await app.register(userRoutes, { prefix: '/api/v1/users' });
  await app.register(publicPostRoutes, { prefix: '/api/v1/posts' });
  await app.register(adminPostRoutes, { prefix: '/api/v1/admin/posts' });
  await app.register(mediaRoutes, { prefix: '/api/v1/media' });
  await app.register(publicTaxonomyRoutes, { prefix: '/api/v1' });
  await app.register(adminTaxonomyRoutes, { prefix: '/api/v1/admin' });
  await app.register(rssRoutes, { prefix: '/' });

  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof ZodError) {
      // Zod 4: instance .flatten() is deprecated → use z.flattenError().
      return reply.code(400).send({ error: 'ValidationError', issues: z.flattenError(err) });
    }
    app.log.error(err);
    const e = err as { statusCode?: number; message?: string };
    reply.code(e.statusCode ?? 500).send({ error: e.message || 'Internal Server Error' });
  });

  return app;
}
