'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, type PostStatus } from '@/lib/api';

interface Row {
  id: string;
  slug: string;
  title: string;
  status: PostStatus;
  published_date: string | null;
  updated_at: string;
}

const STATUSES: (PostStatus | 'ALL')[] = [
  'ALL',
  'DRAFT',
  'PENDING_REVIEW',
  'SCHEDULED',
  'PUBLISHED',
  'ARCHIVED',
];

export default function PostsPage() {
  const [posts, setPosts] = useState<Row[]>([]);
  const [filter, setFilter] = useState<PostStatus | 'ALL'>('ALL');

  async function load() {
    const qs = filter === 'ALL' ? '' : `?status=${filter}`;
    const { data } = await api<{ data: Row[] }>(`/api/v1/admin/posts${qs}`);
    setPosts(data);
  }
  useEffect(() => {
    load().catch(console.error);
  }, [filter]);

  async function remove(id: string) {
    if (!confirm('Delete this post?')) return;
    await api(`/api/v1/admin/posts/${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Posts</h1>
        <Link
          href="/dashboard/posts/new"
          className="bg-slate-900 text-white rounded-lg px-3 py-1.5 text-sm"
        >
          + New post
        </Link>
      </div>
      <div className="flex gap-2 text-xs">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-2.5 py-1 rounded-full border ${filter === s ? 'bg-slate-900 text-white border-slate-900' : 'bg-white'}`}
          >
            {s}
          </button>
        ))}
      </div>
      <div className="bg-white rounded-xl border divide-y">
        {posts.map((p) => (
          <div key={p.id} className="flex items-center gap-4 px-4 py-3">
            <div className="flex-1">
              <Link href={`/dashboard/posts/${p.id}/edit`} className="font-medium hover:underline">
                {p.title || '(untitled)'}
              </Link>
              <div className="text-xs text-slate-500">
                /{p.slug} · updated {new Date(p.updated_at).toLocaleString()}
              </div>
            </div>
            <span className="text-xs font-mono uppercase text-slate-500">{p.status}</span>
            {p.status === 'PUBLISHED' && (
              <Link
                href={`/read/${p.slug}`}
                className="text-xs text-blue-600 hover:underline"
                target="_blank"
              >
                View
              </Link>
            )}
            <button onClick={() => remove(p.id)} className="text-xs text-red-600 hover:underline">
              Delete
            </button>
          </div>
        ))}
        {posts.length === 0 && (
          <p className="px-4 py-6 text-sm text-slate-500">Nothing here yet.</p>
        )}
      </div>
    </div>
  );
}
