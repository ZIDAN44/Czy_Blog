import type { MetadataRoute } from 'next';
import { fetchAllPublished } from '@/lib/posts';
import { SITE_URL } from '@/lib/site';

// Built per request. A build-time sitemap would be generated where the API isn't
// running (the Docker build), and would then list only the home page.
export const dynamic = 'force-dynamic';

/**
 * /sitemap.xml: the home page and every published post.
 *
 * `lastModified` is the publish date. The post's `updated_at` is not used on
 * purpose: the view counter writes to the same row, so it changes on every read,
 * including each crawler visit, and a lastmod that always moves gets ignored.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await fetchAllPublished();
  const newest = posts[0]?.published_date;

  return [
    { url: `${SITE_URL}/`, ...(newest && { lastModified: new Date(newest) }) },
    ...posts.map((post) => ({
      url: `${SITE_URL}/${post.slug}`,
      ...(post.published_date && { lastModified: new Date(post.published_date) }),
    })),
  ];
}
