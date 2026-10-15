'use client';
import { Search, X } from 'lucide-react';
import SegmentedControl, { type Segment } from '@czyblog/ui/SegmentedControl';
import type { PostStatus } from '@/lib/api';
import { STATUS_LABEL } from '@/lib/utils';
import type { StatusFilter } from './usePosts';

const SEGMENTS: Segment<StatusFilter>[] = [
  { value: 'ALL', label: 'All' },
  ...(Object.keys(STATUS_LABEL) as PostStatus[]).map((s) => ({ value: s, label: STATUS_LABEL[s] })),
];

export default function PostsToolbar({
  filter,
  onFilter,
  query,
  onQuery,
}: {
  filter: StatusFilter;
  onFilter: (f: StatusFilter) => void;
  query: string;
  onQuery: (q: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      <div className="max-w-full overflow-x-auto">
        <SegmentedControl
          segments={SEGMENTS}
          value={filter}
          onChange={onFilter}
          label="Filter posts by status"
        />
      </div>
      <div className="ml-auto relative w-full sm:w-72">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-tertiary pointer-events-none" />
        <input
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Search title or slug"
          aria-label="Search posts"
          className="input !pl-9 !pr-9"
        />
        {query && (
          <button
            onClick={() => onQuery('')}
            aria-label="Clear search"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 btn btn-ghost btn-icon btn-sm"
          >
            <X />
          </button>
        )}
      </div>
    </div>
  );
}
