import type { MetadataRoute } from 'next';
import { fetchAllPublished, type PostSummary } from '@/lib/posts';
import { SITE_URL } from '@/lib/site';

// Built per request. A build-time sitemap would be generated where the API isn't
// running (the Docker build), and would then list only the home page.
export const dynamic = 'force-dynamic';

/**
 * /sitemap.xml: the home page and every published post.
 *
 * `lastModified` is the post's last edit (`updated_at`), falling back to the
 * publish date. The home page takes the newest of those, since it lists posts.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await fetchAllPublished();
  const modified = (p: PostSummary) => p.updated_at ?? p.published_date;
  const newest = posts
    .map(modified)
    .filter((d): d is string => Boolean(d))
    .sort()
    .at(-1);

  return [
    { url: `${SITE_URL}/`, ...(newest && { lastModified: new Date(newest) }) },
    ...posts.map((post) => {
      const date = modified(post);
      return {
        url: `${SITE_URL}/${post.slug}`,
        ...(date && { lastModified: new Date(date) }),
      };
    }),
  ];
}
