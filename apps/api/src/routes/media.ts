import type { FastifyInstance } from 'fastify';
import fs from 'node:fs/promises';
import path from 'node:path';
import { customAlphabet } from 'nanoid';
import { prisma } from '../db.js';
import { config } from '../config.js';

const id = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 16);

const ALLOWED_MIME = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml', 'image/avif',
]);

export async function mediaRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate);

  app.post('/upload', async (req, reply) => {
    const file = await req.file();
    if (!file) return reply.code(400).send({ error: 'No file' });
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return reply.code(415).send({ error: `Unsupported media type: ${file.mimetype}` });
    }

    const ext = path.extname(file.filename) || `.${file.mimetype.split('/')[1] ?? 'bin'}`;
    const storageName = `${id()}${ext}`;
    await fs.mkdir(config.uploadDir, { recursive: true });
    const fullPath = path.join(config.uploadDir, storageName);

    const buf = await file.toBuffer();
    await fs.writeFile(fullPath, buf);

    const url = `${config.publicUploadBaseUrl}/${storageName}`;
    const media = await prisma.media.create({
      data: {
        filename: file.filename,
        storagePath: fullPath,
        url,
        mimeType: file.mimetype,
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
  });

  app.get('/', async (req) => {
    const list = await prisma.media.findMany({
      where: { uploadedById: req.user.sub },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return { data: list };
  });
}
