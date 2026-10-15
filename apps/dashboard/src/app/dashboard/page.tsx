'use client';
import { useState } from 'react';
import Link from 'next/link';
import { PenLine } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import RecentActivity from '@/components/overview/RecentActivity';
import Shortcuts from '@/components/overview/Shortcuts';
import StatusTiles from '@/components/overview/StatusTiles';
import { greeting, useOverview } from '@/components/overview/useOverview';
import { currentUser, type PostStatus } from '@/lib/api';
import { canManageUsers } from '@/lib/roles';

export default function Overview() {
  const me = currentUser();
  const { counts, posts, loading, error, reload } = useOverview();
  const [filter, setFilter] = useState<PostStatus | null>(null);

  return (
    <div>
      <PageHeader
        eyebrow={greeting()}
        title={me?.name?.split(' ')[0] ?? 'Welcome'}
        description="Here's where your writing stands today."
        actions={
          // The mobile top bar already carries "Write".
          <Link href="/dashboard/posts/new" className="btn btn-primary max-lg:hidden">
            <PenLine /> New post
          </Link>
        }
      />

      <StatusTiles counts={counts} loading={loading} filter={filter} onFilter={setFilter} />

      <div className="mt-10 grid gap-6 xl:grid-cols-[1fr_18rem]">
        <RecentActivity
          posts={posts}
          loading={loading}
          error={error}
          filter={filter}
          onClearFilter={() => setFilter(null)}
          onRetry={reload}
        />
        <Shortcuts showUsers={canManageUsers(me?.role)} />
      </div>
    </div>
  );
}
