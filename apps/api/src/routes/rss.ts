import type { FastifyInstance } from 'fastify';
import { prisma } from '../db.js';
import { config } from '../config.js';
import { publishedPostWhere } from '../lib/queries.js';

// Characters XML 1.0 forbids outright. They cannot be escaped into validity,
// so a single stray control byte in a title would make the whole feed
// unparseable — strip them before escaping the rest.
// eslint-disable-next-line no-control-regex
const INVALID_XML_CHARS = /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g;

function esc(s: string): string {
  return s
    .replace(INVALID_XML_CHARS, '')
    .replace(
      /[<>&'"]/g,
      (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&#39;', '"': '&quot;' })[c]!,
    );
}

export async function rssRoutes(app: FastifyInstance) {
  app.get('/rss.xml', async (_req, reply) => {
    const posts = await prisma.post.findMany({
      where: publishedPostWhere(),
      orderBy: { publishedAt: 'desc' },
      take: 25,
      select: {
        id: true,
        slug: true,
        title: true,
        excerpt: true,
        publishedAt: true,
        author: { select: { name: true } },
      },
    });

    const items = posts
      .map(
        (p) => `
      <item>
        <title>${esc(p.title)}</title>
        <link>${esc(`${config.publicSiteUrl}/read/${p.slug}`)}</link>
        <guid isPermaLink="false">${esc(p.id)}</guid>
        <pubDate>${p.publishedAt?.toUTCString() ?? ''}</pubDate>
        <author>${esc(p.author.name)}</author>
        ${p.excerpt ? `<description>${esc(p.excerpt)}</description>` : ''}
      </item>`,
      )
      .join('');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <title>Czy Blog</title>
  <link>${esc(config.publicSiteUrl)}</link>
  <description>Latest posts from Czy Blog</description>
  ${items}
</channel></rss>`;

    reply.type('application/rss+xml').send(xml);
  });
}
