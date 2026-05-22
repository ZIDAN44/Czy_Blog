'use client';
import PostForm from '@/components/PostForm';

export default function NewPostPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">New post</h1>
      <PostForm />
    </div>
  );
}
