import type { FastifyBaseLogger } from 'fastify';
import { prisma, PostStatus } from './db.js';

// Publishes posts whose scheduledFor time has arrived. Runs every minute.
export function startScheduler(logger: FastifyBaseLogger, intervalMs = 60_000) {
  const log = logger.child({ component: 'scheduler' });
  const tick = async () => {
    try {
      const now = new Date();
      const due = await prisma.post.findMany({
        where: {
          status: PostStatus.SCHEDULED,
          deletedAt: null,
          scheduledFor: { lte: now },
        },
        select: { id: true },
      });
      for (const { id } of due) {
        await prisma.post.update({
          where: { id },
          data: { status: PostStatus.PUBLISHED, publishedAt: now },
        });
      }
    } catch (err) {
      log.error(err);
    }
  };
  const handle = setInterval(tick, intervalMs);
  tick();
  return () => clearInterval(handle);
}
