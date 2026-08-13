'use client';
import Link from 'next/link';
import PostForm from '@/components/PostForm';

export default function NewPostPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/posts" className="text-xs text-content-secondary hover:text-content">
          ← Back to posts
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight mt-1">New post</h1>
      </div>
      <PostForm />
    </div>
  );
}
