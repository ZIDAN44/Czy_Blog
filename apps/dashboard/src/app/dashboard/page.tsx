'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, type PostStatus } from '@/lib/api';

interface PostSummary {
  id: string;
  slug: string;
  title: string;
  status: PostStatus;
  published_date: string | null;
  updated_at: string;
}

export default function Overview() {
  const [counts, setCounts] = useState<Record<PostStatus, number>>({
    DRAFT: 0,
    PENDING_REVIEW: 0,
    SCHEDULED: 0,
    PUBLISHED: 0,
    ARCHIVED: 0,
  });
  const [recent, setRecent] = useState<PostSummary[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await api<{ data: PostSummary[] }>('/api/v1/admin/posts?limit=100');
      const tally = {
        DRAFT: 0,
        PENDING_REVIEW: 0,
        SCHEDULED: 0,
        PUBLISHED: 0,
        ARCHIVED: 0,
      } as Record<PostStatus, number>;
      for (const p of data) tally[p.status]++;
      setCounts(tally);
      setRecent(data.slice(0, 5));
    })().catch(console.error);
  }, []);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Overview</h1>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {(Object.keys(counts) as PostStatus[]).map((k) => (
          <div key={k} className="bg-white rounded-xl border p-4">
            <div className="text-xs uppercase text-slate-500">{k}</div>
            <div className="text-2xl font-bold mt-1">{counts[k]}</div>
          </div>
        ))}
      </div>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Recent posts</h2>
          <Link
            href="/dashboard/posts/new"
            className="text-sm bg-slate-900 text-white rounded-lg px-3 py-1.5"
          >
            + New post
          </Link>
        </div>
        <div className="bg-white rounded-xl border divide-y">
          {recent.map((p) => (
            <Link
              key={p.id}
              href={`/dashboard/posts/${p.id}/edit`}
              className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50"
            >
              <div className="flex-1">
                <div className="font-medium">{p.title}</div>
                <div className="text-xs text-slate-500">/{p.slug}</div>
              </div>
              <span className="text-xs font-mono uppercase text-slate-500">{p.status}</span>
            </Link>
          ))}
          {recent.length === 0 && (
            <p className="px-4 py-6 text-sm text-slate-500">No posts yet — create one.</p>
          )}
        </div>
      </section>
    </div>
  );
}
