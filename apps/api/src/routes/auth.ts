import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma, Role, type User } from '../db.js';
import { config } from '../config.js';
import { emailField, passwordField } from '../lib/schemas.js';

const loginSchema = z.object({
  email: emailField,
  // Not `passwordField`: an existing password must be accepted as-is for
  // comparison, it just must not be unbounded work for bcrypt.
  password: z.string().min(1).max(72),
});

const bootstrapSchema = z.object({
  email: emailField,
  password: passwordField,
  name: z.string().trim().min(1).max(100),
});

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1).max(72),
    newPassword: passwordField,
  })
  .refine((b) => b.currentPassword !== b.newPassword, {
    message: 'New password must differ from the current one',
    path: ['newPassword'],
  });

// Credential endpoints are the ones worth brute-forcing, so they get a far
// tighter budget than the global limiter.
const CREDENTIAL_RATE_LIMIT = { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } };

// A pre-computed bcrypt hash of a random string. Used to keep the login path
// taking roughly constant time when the email is not in the DB, so attackers
// can't enumerate accounts via response timing.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password-' + Math.random(), config.bcryptRounds);

export async function authRoutes(app: FastifyInstance) {
  const issueSession = (user: Pick<User, 'id' | 'email' | 'name' | 'role' | 'tokenVersion'>) => ({
    token: app.jwt.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
      tv: user.tokenVersion,
    }),
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  });

  app.get('/bootstrap-status', async () => {
    const count = await prisma.user.count();
    return { needsBootstrap: count === 0 };
  });

  app.post('/login', CREDENTIAL_RATE_LIMIT, async (req, reply) => {
    const body = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: body.email } });
    const hash = user?.passwordHash ?? DUMMY_HASH;
    const ok = await bcrypt.compare(body.password, hash);
    if (!user || !ok) {
      return reply.code(401).send({ error: 'Invalid credentials' });
    }
    return issueSession(user);
  });

  app.post('/bootstrap', CREDENTIAL_RATE_LIMIT, async (req, reply) => {
    const body = bootstrapSchema.parse(req.body);
    const passwordHash = await bcrypt.hash(body.password, config.bcryptRounds);

    // Counting and then inserting in two statements lets two concurrent
    // requests both see an empty table and both mint a SUPER_ADMIN. A
    // serializable transaction makes the second one fail instead.
    const user = await prisma
      .$transaction(
        async (tx) => {
          if ((await tx.user.count()) > 0) return null;
          return tx.user.create({
            data: {
              email: body.email,
              name: body.name,
              passwordHash,
              role: Role.SUPER_ADMIN,
            },
          });
        },
        { isolationLevel: 'Serializable' },
      )
      .catch(() => null);

    if (!user) {
      return reply
        .code(409)
        .send({ error: 'Already bootstrapped. Ask an admin to create your account.' });
    }
    req.log.warn({ userId: user.id }, 'first-run bootstrap created a SUPER_ADMIN');
    return reply.code(201).send(issueSession(user));
  });

  app.get('/me', { preHandler: [app.authenticate] }, async (req, reply) => {
    const u = await prisma.user.findUnique({
      where: { id: req.user.sub },
      select: { id: true, email: true, name: true, role: true, bio: true, avatarUrl: true },
    });
    if (!u) return reply.code(401).send({ error: 'Session is no longer valid' });
    return u;
  });

  // Self-service password change (any authenticated user)
  app.post(
    '/change-password',
    { preHandler: [app.authenticate], ...CREDENTIAL_RATE_LIMIT },
    async (req, reply) => {
      const body = changePasswordSchema.parse(req.body);
      const user = await prisma.user.findUnique({ where: { id: req.user.sub } });
      if (!user || !(await bcrypt.compare(body.currentPassword, user.passwordHash))) {
        return reply.code(401).send({ error: 'Current password incorrect' });
      }
      // Bumping tokenVersion invalidates every token issued before this change,
      // so a stolen token stops working the moment the password is rotated.
      const updated = await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash: await bcrypt.hash(body.newPassword, config.bcryptRounds),
          tokenVersion: { increment: 1 },
        },
      });
      // The caller's current token is now invalid too — hand back a fresh one
      // so changing your password doesn't log you out of the tab you're in.
      return issueSession(updated);
    },
  );
}
