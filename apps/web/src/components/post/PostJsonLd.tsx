import type { PostDetail } from '@/lib/posts';
import { SITE_NAME, SITE_URL } from '@/lib/site';

/**
 * BlogPosting structured data, so search engines read the headline, author and
 * publish date directly instead of guessing them from the page.
 *
 * The JSON sits inside a <script>, so `<` is escaped: a title containing
 * `</script>` must not be able to end the element early.
 */
export default function PostJsonLd({ post }: { post: PostDetail }) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    ...(post.excerpt && { description: post.excerpt }),
    ...(post.cover_image && { image: [post.cover_image] }),
    ...(post.published_date && { datePublished: post.published_date }),
    dateModified: post.updated_at,
    author: { '@type': 'Person', name: post.author.name },
    publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
    mainEntityOfPage: post.canonical_link,
    url: post.canonical_link,
    ...(post.tags.length > 0 && { keywords: post.tags.map((t) => t.name).join(', ') }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}
