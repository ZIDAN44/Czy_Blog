import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ReadingProgress from '@/components/ReadingProgress';
import TiptapRender from '@/components/TiptapRender';
import KeepReading from '@/components/post/KeepReading';
import PostFooter from '@/components/post/PostFooter';
import PostHeader from '@/components/post/PostHeader';
import PostJsonLd from '@/components/post/PostJsonLd';
import { fetchMore, fetchPost } from '@/lib/posts';
import { OPEN_GRAPH_BASE } from '@/lib/site';

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const post = await fetchPost((await params).slug);
  if (!post) return { title: 'Not found' };
  const description = post.excerpt ?? undefined;
  const images = post.cover_image ? [post.cover_image] : undefined;
  return {
    title: post.title,
    description,
    // The API's canonical_link is built from the same PUBLIC_SITE_URL as RSS.
    alternates: { canonical: post.canonical_link },
    openGraph: {
      ...OPEN_GRAPH_BASE,
      type: 'article',
      url: post.canonical_link,
      title: post.title,
      description,
      images,
      publishedTime: post.published_date ?? undefined,
      authors: [post.author.name],
      tags: post.tags.map((t) => t.name),
    },
    twitter: { title: post.title, description, images },
  };
}

export default async function ReadPost({ params }: Params) {
  const post = await fetchPost((await params).slug);
  if (!post) notFound();
  const more = await fetchMore(post.id);

  return (
    <>
      <PostJsonLd post={post} />
      <ReadingProgress />
      <article className="px-5 sm:px-8">
        <PostHeader post={post} />
        {post.cover_image && (
          <figure className="max-w-5xl mx-auto mt-10">
            {/* Natural aspect ratio: covers are often screenshots or text graphics,
                and a fixed crop cuts their edges. Very tall images are capped and
                letterboxed instead of cropped. */}
            <img
              src={post.cover_image}
              alt=""
              className="w-full h-auto max-h-[80vh] object-contain bg-surface-sunken rounded-xl ring-1 ring-line"
            />
          </figure>
        )}
        <div className="ProseMirror max-w-[44rem] mx-auto mt-10">
          <TiptapRender doc={post.content} />
        </div>
        <PostFooter post={post} />
      </article>
      <KeepReading posts={more} />
    </>
  );
}
