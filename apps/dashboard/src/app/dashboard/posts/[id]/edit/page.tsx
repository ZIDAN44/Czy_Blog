'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import PostForm from '@/components/PostForm';
import { api, type PostStatus } from '@/lib/api';

interface PostDetail {
  id: string;
  title: string;
  excerpt: string | null;
  content: object;
  cover_image: string | null;
  status: PostStatus;
  scheduled_for: string | null;
  category: { slug: string } | null;
  tags: { slug: string }[];
}

export default function EditPostPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [post, setPost] = useState<PostDetail | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await api<{ data: PostDetail }>(`/api/v1/admin/posts/${id}`);
      setPost(data);
    })().catch(console.error);
  }, [id]);

  if (!post) return <p className="text-slate-500">Loading…</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Edit post</h1>
      <PostForm
        postId={post.id}
        initial={{
          title: post.title,
          excerpt: post.excerpt ?? '',
          content: post.content,
          coverImageUrl: post.cover_image ?? '',
          status: post.status,
          scheduledFor: post.scheduled_for
            ? new Date(post.scheduled_for).toISOString().slice(0, 16)
            : '',
          categorySlug: post.category?.slug ?? '',
          tagSlugs: post.tags.map((t) => t.slug).join(', '),
        }}
      />
    </div>
  );
}
