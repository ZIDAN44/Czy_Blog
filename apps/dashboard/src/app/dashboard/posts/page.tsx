'use client';
import { useState } from 'react';
import Link from 'next/link';
import { FileText, PenLine } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { EmptyState, ListError, ListSkeleton } from '@/components/common/ListStates';
import PostRowItem, { POST_COLUMNS } from '@/components/posts/PostRowItem';
import PostsToolbar from '@/components/posts/PostsToolbar';
import { searchPosts, usePosts, type StatusFilter } from '@/components/posts/usePosts';
import { STATUS_LABEL } from '@/lib/utils';

export default function PostsPage() {
  const [filter, setFilter] = useState<StatusFilter>('ALL');
  const [query, setQuery] = useState('');
  const { posts, loading, error, reload, remove } = usePosts(filter);
  const visible = searchPosts(posts, query);

  return (
    <div>
      <PageHeader
        title="Posts"
        description="Drafts, scheduled posts, and everything published."
        actions={
          <Link href="/dashboard/posts/new" className="btn btn-primary">
            <PenLine /> New post
          </Link>
        }
      />

      <PostsToolbar filter={filter} onFilter={setFilter} query={query} onQuery={setQuery} />

      <div className="card overflow-hidden">
        <div
          className={`hidden md:grid ${POST_COLUMNS} gap-4 px-5 h-10 items-center border-b border-line bg-surface-sunken/50 t-label`}
        >
          <span>Title</span>
          <span>Status</span>
          <span>Updated</span>
          <span className="sr-only">Actions</span>
        </div>

        {loading && <ListSkeleton rows={5} />}
        {error && !loading && <ListError message={error} onRetry={reload} />}
        {!loading && !error && visible.length === 0 && (
          <NoPosts filter={filter} query={query} onClearQuery={() => setQuery('')} />
        )}
        {!loading &&
          visible.map((p) => <PostRowItem key={p.id} post={p} onDelete={() => remove(p.id)} />)}
      </div>

      {!loading && visible.length > 0 && (
        <p className="t-caption mt-3 px-1">
          {visible.length} {visible.length === 1 ? 'post' : 'posts'}
        </p>
      )}
    </div>
  );
}

function NoPosts({
  filter,
  query,
  onClearQuery,
}: {
  filter: StatusFilter;
  query: string;
  onClearQuery: () => void;
}) {
  if (query)
    return (
      <EmptyState
        icon={FileText}
        title="No matches"
        hint={`Nothing matches “${query}”.`}
        action={
          <button onClick={onClearQuery} className="btn btn-secondary">
            Clear search
          </button>
        }
      />
    );
  return (
    <EmptyState
      icon={FileText}
      title={filter === 'ALL' ? 'No posts yet' : `No ${STATUS_LABEL[filter].toLowerCase()}`}
      hint="Posts you write will show up here."
      action={
        <Link href="/dashboard/posts/new" className="btn btn-primary">
          <PenLine /> Write a post
        </Link>
      }
    />
  );
}
