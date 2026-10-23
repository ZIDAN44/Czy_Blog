import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

// Rendered per request so it reads the server's PUBLIC_SITE_URL. Left static, Next
// renders it once at image build time, where the variable isn't set, and every
// deployment then advertises a localhost sitemap.
export const dynamic = 'force-dynamic';

/** /robots.txt: everything crawlable, and where the sitemap is. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
