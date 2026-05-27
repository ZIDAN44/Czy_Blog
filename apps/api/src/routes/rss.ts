import type { FastifyInstance } from 'fastify';
import { prisma, PostStatus } from '../db.js';
import { config } from '../config.js';

function esc(s: string): string {
  return s.replace(
    /[<>&'"]/g,
    (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&#39;', '"': '&quot;' })[c]!,
  );
}

export async function rssRoutes(app: FastifyInstance) {
  app.get('/rss.xml', async (_req, reply) => {
    const posts = await prisma.post.findMany({
      where: { status: PostStatus.PUBLISHED, deletedAt: null, publishedAt: { lte: new Date() } },
      orderBy: { publishedAt: 'desc' },
      take: 25,
      include: { author: true },
    });

    const items = posts
      .map(
        (p) => `
      <item>
        <title>${esc(p.title)}</title>
        <link>${config.publicSiteUrl}/posts/${p.slug}</link>
        <guid isPermaLink="false">${p.id}</guid>
        <pubDate>${p.publishedAt?.toUTCString() ?? ''}</pubDate>
        <author>${esc(p.author.name)}</author>
        ${p.excerpt ? `<description>${esc(p.excerpt)}</description>` : ''}
      </item>`,
      )
      .join('');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <title>Czy Blog</title>
  <link>${config.publicSiteUrl}</link>
  <description>Latest posts from Czy Blog</description>
  ${items}
</channel></rss>`;

    reply.type('application/rss+xml').send(xml);
  });
}
