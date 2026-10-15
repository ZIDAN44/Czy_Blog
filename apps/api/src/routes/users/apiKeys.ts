import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { prisma, Role } from '../../db.js';
import { atLeast } from '../../lib/rbac.js';
import { generateApiKey } from '../../lib/apiKey.js';
import { idParam } from '../../lib/schemas.js';

// Cap live keys per user — each is one more credential that can leak.
const MAX_LIVE_KEYS = 20;

async function listKeys(req: FastifyRequest) {
  const keys = await prisma.apiKey.findMany({
    where: { ownerId: req.user.sub },
    select: {
      id: true,
      name: true,
      prefix: true,
      lastUsedAt: true,
      revokedAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  return { data: keys };
}

async function createKey(req: FastifyRequest, reply: FastifyReply) {
  // Only AUTHOR+ mint keys; contributors don't publish, so need none.
  if (!atLeast(req.user.role, Role.AUTHOR)) {
    return reply.code(403).send({ error: 'Insufficient role to create API keys' });
  }
  const { name } = z.object({ name: z.string().trim().min(1).max(100) }).parse(req.body);

  const live = await prisma.apiKey.count({ where: { ownerId: req.user.sub, revokedAt: null } });
  if (live >= MAX_LIVE_KEYS) {
    return reply.code(409).send({ error: 'Too many active API keys; revoke one first' });
  }

  const { plaintext, prefix, hash } = generateApiKey();
  const key = await prisma.apiKey.create({
    data: { name, prefix, keyHash: hash, ownerId: req.user.sub },
  });
  // plaintext is returned once and never stored.
  return reply.code(201).send({ id: key.id, name: key.name, prefix, key: plaintext });
}

async function revokeKey(req: FastifyRequest, reply: FastifyReply) {
  const { id } = idParam.parse(req.params);
  // Scope to the owner so a guessed id can't revoke another's key, and lookup+update can't race.
  const { count } = await prisma.apiKey.updateMany({
    where: { id, ownerId: req.user.sub, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (count === 0) return reply.code(404).send({ error: 'Not found' });
  return { ok: true };
}

// API keys for the headless consumer (the personal site); each user manages their own.
export async function apiKeyRoutes(app: FastifyInstance) {
  app.get('/', listKeys);
  app.post('/', createKey);
  app.delete('/:id', revokeKey);
}
