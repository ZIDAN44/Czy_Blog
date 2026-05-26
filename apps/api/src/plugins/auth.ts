import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import type { FastifyInstance } from 'fastify';
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
    authenticate: (
      req: import('fastify').FastifyRequest,
      reply: import('fastify').FastifyReply,
    ) => Promise<void>;
    optionalAuth: (
      req: import('fastify').FastifyRequest,
      reply: import('fastify').FastifyReply,
    ) => Promise<void>;
    apiKeyAuth: (
      req: import('fastify').FastifyRequest,
      reply: import('fastify').FastifyReply,
    ) => Promise<void>;
  }
  interface FastifyRequest {
    apiKeyOwnerId?: string;
  }
}

export default fp(async (app: FastifyInstance) => {
  await app.register(jwt, { secret: config.jwtSecret });

  // Verify the JWT, then re-load the user's role from the DB so that role
  // changes (demotions, deletions) take effect immediately rather than
  // waiting up to the 7-day token expiry. If the user no longer exists,
  // the token is rejected.
  app.decorate('authenticate', async (req, reply) => {
    try {
      await req.jwtVerify();
    } catch {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
    const claims = req.user as { sub?: string };
    if (!claims?.sub) return reply.code(401).send({ error: 'Unauthorized' });
    const fresh = await prisma.user.findUnique({
      where: { id: claims.sub },
      select: { id: true, email: true, role: true },
    });
    if (!fresh) return reply.code(401).send({ error: 'Account no longer exists' });
    req.user = { sub: fresh.id, email: fresh.email, role: fresh.role };
  });

  app.decorate('optionalAuth', async (req) => {
    try {
      await req.jwtVerify();
      const claims = req.user as { sub?: string };
      if (claims?.sub) {
        const fresh = await prisma.user.findUnique({
          where: { id: claims.sub },
          select: { id: true, email: true, role: true },
        });
        if (fresh) {
          req.user = { sub: fresh.id, email: fresh.email, role: fresh.role };
        }
      }
    } catch {
      /* anonymous */
    }
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
