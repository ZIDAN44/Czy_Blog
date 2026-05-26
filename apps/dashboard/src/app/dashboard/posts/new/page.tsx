'use client';
import Link from 'next/link';
import PostForm from '@/components/PostForm';

export default function NewPostPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard/posts" className="text-xs text-slate-500 hover:text-slate-900">
          ← Back to posts
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight mt-1">New post</h1>
      </div>
      <PostForm />
    </div>
  );
}
