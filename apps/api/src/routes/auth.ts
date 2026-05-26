import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma, Role } from '../db.js';

const emailField = z
  .string()
  .email()
  .transform((s) => s.trim().toLowerCase());

const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1).max(200),
});

const bootstrapSchema = z.object({
  email: emailField,
  password: z.string().min(8).max(200),
  name: z.string().min(1).max(100),
});

// A pre-computed bcrypt hash of a random string. Used to keep the login path
// taking roughly constant time when the email is not in the DB, so attackers
// can't enumerate accounts via response timing.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password-' + Math.random(), 10);

export async function authRoutes(app: FastifyInstance) {
  app.get('/bootstrap-status', async () => {
    const count = await prisma.user.count();
    return { needsBootstrap: count === 0 };
  });

  app.post('/login', async (req, reply) => {
    const body = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: body.email } });
    const hash = user?.passwordHash ?? DUMMY_HASH;
    const ok = await bcrypt.compare(body.password, hash);
    if (!user || !ok) {
      return reply.code(401).send({ error: 'Invalid credentials' });
    }
    const token = app.jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      { expiresIn: '7d' },
    );
    return {
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    };
  });

  app.post('/bootstrap', async (req, reply) => {
    const existing = await prisma.user.count();
    if (existing > 0) {
      return reply
        .code(409)
        .send({ error: 'Already bootstrapped. Ask an admin to create your account.' });
    }
    const body = bootstrapSchema.parse(req.body);
    const passwordHash = await bcrypt.hash(body.password, 10);
    const user = await prisma.user.create({
      data: {
        email: body.email,
        name: body.name,
        passwordHash,
        role: Role.SUPER_ADMIN,
      },
    });
    const token = app.jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      { expiresIn: '7d' },
    );
    return reply.code(201).send({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  });

  app.get('/me', { preHandler: [app.authenticate] }, async (req) => {
    const u = await prisma.user.findUnique({ where: { id: req.user.sub } });
    if (!u) throw new Error('User missing');
    return {
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      bio: u.bio,
      avatarUrl: u.avatarUrl,
    };
  });

  // Self-service password change (any authenticated user)
  app.post('/change-password', { preHandler: [app.authenticate] }, async (req, reply) => {
    const body = z
      .object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(8),
      })
      .parse(req.body);
    const user = await prisma.user.findUnique({ where: { id: req.user.sub } });
    if (!user || !(await bcrypt.compare(body.currentPassword, user.passwordHash))) {
      return reply.code(401).send({ error: 'Current password incorrect' });
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await bcrypt.hash(body.newPassword, 10) },
    });
    return { ok: true };
  });
}
