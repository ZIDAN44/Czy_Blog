import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { config } from '../config.js';
import { prisma } from '../db.js';
import { hashApiKey } from '../lib/apiKey.js';
import type { Role } from '../db.js';

type SessionClaims = { sub: string; email: string; role: Role; tv: number };

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: SessionClaims;
    user: SessionClaims;
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    apiKeyAuth: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
  interface FastifyRequest {
    apiKeyOwnerId?: string;
  }
}

// A key is `czk_` + 32 base64url chars; anything longer we never issued, so reject early.
const MAX_API_KEY_LENGTH = 128;

// "last used" resolution: touch the DB at most once a minute, not on every request.
const API_KEY_TOUCH_INTERVAL_MS = 60_000;

// Re-load the user behind a verified token; null = reject (account gone, or
// tokenVersion moved on, e.g. password changed after the token was issued).
async function resolveSession(claims: unknown): Promise<SessionClaims | null> {
  const c = claims as { sub?: unknown; tv?: unknown } | undefined;
  if (typeof c?.sub !== 'string' || !c.sub) return null;
  const fresh = await prisma.user.findUnique({
    where: { id: c.sub },
    select: { id: true, email: true, role: true, tokenVersion: true },
  });
  if (!fresh) return null;
  if (typeof c.tv !== 'number' || c.tv !== fresh.tokenVersion) return null;
  return { sub: fresh.id, email: fresh.email, role: fresh.role, tv: fresh.tokenVersion };
}

export default fp(async (app: FastifyInstance) => {
  await app.register(jwt, {
    secret: config.jwtSecret,
    sign: {
      algorithm: 'HS256',
      iss: config.jwtIssuer,
      aud: config.jwtAudience,
      expiresIn: '7d',
    },
    verify: {
      algorithms: ['HS256'],
      allowedIss: config.jwtIssuer,
      allowedAud: config.jwtAudience,
    },
  });

  // Verify the JWT, then re-load the user from the DB so role changes (demotions,
  // deletions, password resets) take effect immediately, not after the 7-day expiry.
  app.decorate('authenticate', async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      await req.jwtVerify();
    } catch {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
    const session = await resolveSession(req.user);
    if (!session) return reply.code(401).send({ error: 'Session is no longer valid' });
    req.user = session;
  });

  app.decorate('apiKeyAuth', async (req: FastifyRequest, reply: FastifyReply) => {
    const header = req.headers['x-api-key'];
    if (typeof header !== 'string' || !header || header.length > MAX_API_KEY_LENGTH) {
      return reply.code(401).send({ error: 'Missing or malformed x-api-key' });
    }
    const key = await prisma.apiKey.findUnique({ where: { keyHash: hashApiKey(header) } });
    if (!key || key.revokedAt) {
      return reply.code(401).send({ error: 'Invalid API key' });
    }
    const now = Date.now();
    if (!key.lastUsedAt || now - key.lastUsedAt.getTime() > API_KEY_TOUCH_INTERVAL_MS) {
      await prisma.apiKey
        .update({ where: { id: key.id }, data: { lastUsedAt: new Date(now) } })
        .catch((err) => req.log.warn({ err }, 'failed to touch api key lastUsedAt'));
    }
    req.apiKeyOwnerId = key.ownerId;
  });
});
