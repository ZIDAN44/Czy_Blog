import type { FastifyInstance } from 'fastify';
import fs from 'node:fs/promises';
import path from 'node:path';
import { customAlphabet } from 'nanoid';
import { prisma } from '../db.js';
import { config } from '../config.js';
import { pageArgs, paginated, paginationSchema } from '../lib/queries.js';

const id = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 16);

/**
 * The stored extension is chosen from this table, never from the uploaded
 * filename. Deriving it from `file.filename` let a caller store `x.html` (or
 * anything else) under the static `/uploads/` prefix and get it served back as
 * that type — stored XSS on the API origin.
 *
 * SVG is deliberately absent: it is an XML document that can carry script, so
 * it cannot be treated as an inert image.
 */
const IMAGE_TYPES = [
  {
    mime: 'image/jpeg',
    ext: '.jpg',
    matches: (b: Buffer) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    mime: 'image/png',
    ext: '.png',
    matches: (b: Buffer) =>
      b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  {
    mime: 'image/gif',
    ext: '.gif',
    matches: (b: Buffer) =>
      b.subarray(0, 6).toString('latin1') === 'GIF87a' ||
      b.subarray(0, 6).toString('latin1') === 'GIF89a',
  },
  {
    mime: 'image/webp',
    ext: '.webp',
    matches: (b: Buffer) =>
      b.subarray(0, 4).toString('latin1') === 'RIFF' &&
      b.subarray(8, 12).toString('latin1') === 'WEBP',
  },
  {
    mime: 'image/avif',
    ext: '.avif',
    // ISOBMFF: 4-byte box size, 'ftyp', then a brand. AVIF brands start 'avif'
    // for stills and 'avis' for sequences.
    matches: (b: Buffer) => {
      if (b.subarray(4, 8).toString('latin1') !== 'ftyp') return false;
      const brand = b.subarray(8, 12).toString('latin1');
      return brand === 'avif' || brand === 'avis';
    },
  },
] as const;

const MIN_SNIFF_BYTES = 12;

/** Identify the file from its own bytes rather than the client's Content-Type. */
function sniffImage(buf: Buffer): { mime: string; ext: string } | null {
  if (buf.length < MIN_SNIFF_BYTES) return null;
  const hit = IMAGE_TYPES.find((t) => t.matches(buf));
  return hit ? { mime: hit.mime, ext: hit.ext } : null;
}

/**
 * The original name is kept only for display. Strip anything that could be
 * read as a path or as control characters before it is stored and echoed back.
 */
function safeDisplayName(raw: string | undefined): string {
  // eslint-disable-next-line no-control-regex
  const base = path.basename(raw ?? '').replace(/[\x00-\x1f\x7f<>:"/\\|?*]/g, '');
  const cleaned = base.trim().slice(0, 120);
  return cleaned || 'upload';
}

export async function mediaRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  app.post(
    '/upload',
    {
      // Uploads are far more expensive than a JSON request; give them their own
      // budget instead of letting them consume the global one.
      config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
    },
    async (req, reply) => {
      const file = await req.file();
      if (!file) return reply.code(400).send({ error: 'No file' });

      const buf = await file.toBuffer();
      // @fastify/multipart stops reading at the configured limit and flags the
      // stream rather than throwing, so a truncated file would otherwise be
      // stored as a valid-looking partial upload.
      if (file.file.truncated) {
        return reply.code(413).send({ error: `File exceeds ${config.maxUploadBytes} bytes` });
      }

      const sniffed = sniffImage(buf);
      if (!sniffed) {
        return reply
          .code(415)
          .send({ error: 'Unsupported file: expected a JPEG, PNG, GIF, WebP or AVIF image' });
      }

      const storageName = `${id()}${sniffed.ext}`;
      const root = path.resolve(config.uploadDir);
      const fullPath = path.join(root, storageName);
      // `storageName` is built from a fixed alphabet and a fixed extension, so
      // this cannot currently escape — assert it anyway, because that guarantee
      // lives in another function.
      if (path.dirname(fullPath) !== root) {
        return reply.code(400).send({ error: 'Invalid upload target' });
      }

      await fs.mkdir(root, { recursive: true });
      await fs.writeFile(fullPath, buf);

      const url = `${config.publicUploadBaseUrl}/${storageName}`;
      const media = await prisma.media.create({
        data: {
          filename: safeDisplayName(file.filename),
          storagePath: fullPath,
          url,
          mimeType: sniffed.mime,
          sizeBytes: buf.byteLength,
          uploadedById: req.user.sub,
        },
      });

      return reply.code(201).send({
        id: media.id,
        url: media.url,
        mime_type: media.mimeType,
        size_bytes: media.sizeBytes,
        filename: media.filename,
      });
    },
  );

  app.get('/', async (req) => {
    const q = paginationSchema({ maxLimit: 100, defaultLimit: 50 }).parse(req.query);
    const where = { uploadedById: req.user.sub };
    const [total, list] = await Promise.all([
      prisma.media.count({ where }),
      prisma.media.findMany({
        where,
        select: {
          id: true,
          filename: true,
          url: true,
          mimeType: true,
          sizeBytes: true,
          width: true,
          height: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        ...pageArgs(q),
      }),
    ]);
    return { data: list, pagination: paginated(total, q.page, q.limit) };
  });
}
