import type { FastifyBaseLogger } from 'fastify';
import { prisma, PostStatus } from './db.js';
import { config } from './config.js';
import { sweepOrphanedMedia } from './lib/mediaCleanup.js';

// Publishes posts whose scheduledFor time has arrived. Runs every minute.
export function startScheduler(logger: FastifyBaseLogger, intervalMs = 60_000) {
  const log = logger.child({ component: 'scheduler' });
  const tick = async () => {
    try {
      const now = new Date();
      // One updateMany, not select-then-update: read/write can't drift and two
      // instances ticking together can't both publish the same post.
      const { count } = await prisma.post.updateMany({
        where: {
          status: PostStatus.SCHEDULED,
          deletedAt: null,
          scheduledFor: { lte: now },
        },
        data: { status: PostStatus.PUBLISHED, publishedAt: now },
      });
      if (count > 0) log.info({ count }, 'published scheduled posts');
    } catch (err) {
      log.error(err);
    }
  };
  const handle = setInterval(tick, intervalMs);
  tick();
  return () => clearInterval(handle);
}

// Sweeps orphaned media on boot, then every MEDIA_CLEANUP_INTERVAL_HOURS.
export function startMediaCleanup(
  logger: FastifyBaseLogger,
  intervalMs = config.mediaCleanupIntervalHours * 60 * 60_000,
) {
  const log = logger.child({ component: 'media-cleanup' });
  const tick = async () => {
    try {
      await sweepOrphanedMedia(log);
    } catch (err) {
      log.error(err);
    }
  };
  const handle = setInterval(tick, intervalMs);
  tick();
  return () => clearInterval(handle);
}
