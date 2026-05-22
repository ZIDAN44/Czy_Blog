import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { config } from '../config.js';
import { prisma } from '../db.js';
import { hashApiKey } from '../lib/apiKey.js';
import type { Role } from '../db.js';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: string; email: string; role: Role };
    user: { sub: string; email: string; role: Role };
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    optionalAuth: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    apiKeyAuth: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
  interface FastifyRequest {
    apiKeyOwnerId?: string;
  }
}

export default fp(async (app: FastifyInstance) => {
  await app.register(jwt, { secret: config.jwtSecret });

  app.decorate('authenticate', async (req, reply) => {
    try {
      await req.jwtVerify();
    } catch {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
  });

  app.decorate('optionalAuth', async (req) => {
    try { await req.jwtVerify(); } catch { /* anonymous */ }
  });

  app.decorate('apiKeyAuth', async (req, reply) => {
    const header = req.headers['x-api-key'];
    if (typeof header !== 'string' || !header) {
      return reply.code(401).send({ error: 'Missing x-api-key' });
    }
    const hash = hashApiKey(header);
    const key = await prisma.apiKey.findUnique({ where: { keyHash: hash } });
    if (!key || key.revokedAt) {
      return reply.code(401).send({ error: 'Invalid API key' });
    }
    await prisma.apiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } });
    req.apiKeyOwnerId = key.ownerId;
  });
});
