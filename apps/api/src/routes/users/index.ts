import type { FastifyInstance } from 'fastify';
import { accountRoutes } from './accounts.js';
import { apiKeyRoutes } from './apiKeys.js';

// Everything under /users requires a session; the hook is inherited by both children.
export async function userRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);
  await app.register(accountRoutes);
  await app.register(apiKeyRoutes, { prefix: '/me/api-keys' });
}
