import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

/** /robots.txt: everything crawlable, and where the sitemap is. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
