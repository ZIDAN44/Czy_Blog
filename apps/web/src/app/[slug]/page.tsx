import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ReadingProgress from '@/components/ReadingProgress';
import TiptapRender from '@/components/TiptapRender';
import KeepReading from '@/components/post/KeepReading';
import PostFooter from '@/components/post/PostFooter';
import PostHeader from '@/components/post/PostHeader';
import { fetchMore, fetchPost } from '@/lib/posts';

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const post = await fetchPost((await params).slug);
  if (!post) return { title: 'Not found' };
  return {
    title: post.title,
    description: post.excerpt ?? undefined,
    openGraph: { title: post.title, images: post.cover_image ? [post.cover_image] : undefined },
  };
}

export default async function ReadPost({ params }: Params) {
  const post = await fetchPost((await params).slug);
  if (!post) notFound();
  const more = await fetchMore(post.id);

  return (
    <>
      <ReadingProgress />
      <article className="px-5 sm:px-8">
        <PostHeader post={post} />
        {post.cover_image && (
          <figure className="max-w-5xl mx-auto mt-10">
            <img
              src={post.cover_image}
              alt=""
              className="w-full aspect-[16/9] object-cover rounded-xl ring-1 ring-line"
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
