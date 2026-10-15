'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import PostForm from '@/components/post-editor/PostForm';
import { api, type PostStatus } from '@/lib/api';
import { errMsg } from '@/lib/utils';

interface PostDetail {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: object;
  cover_image: string | null;
  status: PostStatus;
  scheduled_for: string | null;
  category: { slug: string } | null;
  tags: { slug: string }[];
}

// datetime-local wants local wall-clock time, not UTC.
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export default function EditPostPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [post, setPost] = useState<PostDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await api<{ data: PostDetail }>(`/api/v1/admin/posts/${id}`);
      setPost(data);
    })().catch((e) => setError(errMsg(e, 'Could not load this post.')));
  }, [id]);

  if (error)
    return (
      <div className="py-24 text-center">
        <p className="t-heading">{error}</p>
        <Link href="/dashboard/posts" className="btn btn-secondary mt-4">
          Back to posts
        </Link>
      </div>
    );

  if (!post)
    return (
      <div className="space-y-6" aria-busy>
        <div className="skeleton h-9 w-1/3" />
        <div className="grid xl:grid-cols-[1fr_19rem] gap-6">
          <div className="card p-6 space-y-4">
            <div className="skeleton h-10 w-2/3" />
            <div className="skeleton h-5 w-1/2" />
            <div className="skeleton h-64 w-full" />
          </div>
          <div className="hidden xl:block card h-64" />
        </div>
      </div>
    );

  return (
    <PostForm
      postId={post.id}
      slug={post.slug}
      initial={{
        title: post.title,
        excerpt: post.excerpt ?? '',
        content: post.content,
        coverImageUrl: post.cover_image ?? '',
        status: post.status,
        scheduledFor: post.scheduled_for ? toLocalInput(post.scheduled_for) : '',
        categorySlug: post.category?.slug ?? '',
        tagSlugs: post.tags.map((t) => t.slug).join(', '),
      }}
    />
  );
}
