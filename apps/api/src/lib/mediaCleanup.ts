import type { FastifyBaseLogger } from 'fastify';
import fs from 'node:fs/promises';
import { prisma } from '../db.js';

// URL -> storage filename, so matching survives base-URL changes.
function urlKey(url: string | null | undefined): string | null {
  if (!url) return null;
  return url.split('/').filter(Boolean).pop() ?? null;
}

// Collect every `attrs.src` (Tiptap image URLs) from block-editor JSON.
function collectContentSrcs(node: unknown, out: Set<string>): void {
  if (!node) return;
  if (Array.isArray(node)) {
    for (const child of node) collectContentSrcs(child, out);
    return;
  }
  if (typeof node !== 'object') return;
  const obj = node as Record<string, unknown>;
  const attrs = obj.attrs as Record<string, unknown> | undefined;
  if (attrs && typeof attrs.src === 'string') out.add(attrs.src);
  if (Array.isArray(obj.content)) collectContentSrcs(obj.content, out);
}

// Filenames a single post references (cover + content images).
function postUrlKeys(post: { coverImageUrl: string | null; content: unknown }): Set<string> {
  const keys = new Set<string>();
  const cover = urlKey(post.coverImageUrl);
  if (cover) keys.add(cover);
  const srcs = new Set<string>();
  collectContentSrcs(post.content, srcs);
  for (const src of srcs) {
    const key = urlKey(src);
    if (key) keys.add(key);
  }
  return keys;
}

// All in-use filenames (live posts + avatars). Soft-deleted posts are excluded.
async function collectReferencedKeys(): Promise<Set<string>> {
  const [posts, users] = await Promise.all([
    prisma.post.findMany({
      where: { deletedAt: null },
      select: { coverImageUrl: true, content: true },
    }),
    prisma.user.findMany({ where: { avatarUrl: { not: null } }, select: { avatarUrl: true } }),
  ]);

  const keys = new Set<string>();
  for (const post of posts) for (const k of postUrlKeys(post)) keys.add(k);
  for (const user of users) {
    const k = urlKey(user.avatarUrl);
    if (k) keys.add(k);
  }
  return keys;
}

async function deleteMediaRows(
  rows: { id: string; storagePath: string }[],
  log: FastifyBaseLogger,
): Promise<number> {
  let removed = 0;
  for (const row of rows) {
    try {
      await fs.unlink(row.storagePath);
    } catch (err) {
      // Missing file is fine and still drop the row. Log anything else, keep going.
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        log.warn({ err, storagePath: row.storagePath }, 'failed to unlink media file');
      }
    }
    await prisma.media.delete({ where: { id: row.id } });
    removed += 1;
  }
  return removed;
}

// Delete a deleted post's media now, keeping any still used elsewhere.
export async function purgePostMedia(
  post: { coverImageUrl: string | null; content: unknown },
  log: FastifyBaseLogger,
): Promise<void> {
  const keys = postUrlKeys(post);
  if (keys.size === 0) return;

  const stillReferenced = await collectReferencedKeys();
  const orphanKeys = new Set([...keys].filter((k) => !stillReferenced.has(k)));
  if (orphanKeys.size === 0) return;

  // Narrow in the query rather than loading the whole media table and
  // filtering in memory. `url` ends with the storage filename, so an endsWith
  // match on each orphan key is both index-friendlier and bounded by the size
  // of this post rather than by the size of the library.
  const candidates = await prisma.media.findMany({
    where: { OR: [...orphanKeys].map((key) => ({ url: { endsWith: `/${key}` } })) },
    select: { id: true, storagePath: true, url: true },
  });
  const toDelete = candidates.filter((m) => {
    const k = urlKey(m.url);
    return k !== null && orphanKeys.has(k);
  });

  const removed = await deleteMediaRows(toDelete, log);
  if (removed > 0) log.info({ removed }, 'purged media attached to deleted post');
}

// Sweep via the isOrphan flag: in use -> clear; unreferenced -> flag, then
// delete on the next sweep if still unreferenced (one cycle of grace).
export async function sweepOrphanedMedia(log: FastifyBaseLogger): Promise<void> {
  const referenced = await collectReferencedKeys();
  const all = await prisma.media.findMany({
    select: { id: true, url: true, storagePath: true, isOrphan: true },
  });

  const toClear: string[] = [];
  const toFlag: string[] = [];
  const toDelete: { id: string; storagePath: string }[] = [];

  for (const m of all) {
    const key = urlKey(m.url);
    const inUse = key !== null && referenced.has(key);
    if (inUse) {
      if (m.isOrphan) toClear.push(m.id);
    } else if (m.isOrphan) {
      toDelete.push({ id: m.id, storagePath: m.storagePath });
    } else {
      toFlag.push(m.id);
    }
  }

  if (toClear.length)
    await prisma.media.updateMany({ where: { id: { in: toClear } }, data: { isOrphan: false } });
  if (toFlag.length)
    await prisma.media.updateMany({ where: { id: { in: toFlag } }, data: { isOrphan: true } });
  const removed = await deleteMediaRows(toDelete, log);

  if (toClear.length || toFlag.length || removed)
    log.info(
      { cleared: toClear.length, flagged: toFlag.length, removed },
      'orphan media sweep complete',
    );
}
