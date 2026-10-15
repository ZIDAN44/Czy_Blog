'use client';
import { Trash2 } from 'lucide-react';
import type { Role } from '@/lib/api';
import { ROLES, ROLE_DOT, ROLE_NAME } from '@/lib/roles';
import { formatDate, initials } from '@/lib/utils';
import type { UserRow } from './useUsers';

const COLUMNS = 'sm:grid-cols-[1fr_10.5rem_6rem_2.5rem]';

interface Props {
  users: UserRow[];
  loading: boolean;
  meId?: string;
  /** Super admins can change roles and delete anyone but themselves. */
  canEdit: boolean;
  onChangeRole: (id: string, role: Role) => void;
  onRemove: (id: string) => void;
}

export default function UsersTable({ users, loading, ...rowProps }: Props) {
  return (
    <section className="card overflow-hidden">
      <div
        className={`hidden sm:grid ${COLUMNS} gap-4 px-5 h-10 items-center border-b border-line bg-surface-sunken/50 t-label`}
      >
        <span>Member</span>
        <span>Role</span>
        <span>Joined</span>
        <span />
      </div>
      {loading && [0, 1, 2].map((i) => <RowSkeleton key={i} />)}
      {users.map((u) => (
        <UserItem key={u.id} user={u} {...rowProps} />
      ))}
      {!loading && users.length === 0 && (
        <p className="px-5 py-12 t-secondary text-center">No users yet.</p>
      )}
    </section>
  );
}

function UserItem({
  user: u,
  meId,
  canEdit,
  onChangeRole,
  onRemove,
}: Omit<Props, 'users' | 'loading'> & { user: UserRow }) {
  const isMe = u.id === meId;
  const editable = canEdit && !isMe;
  return (
    <div
      className={`grid grid-cols-[1fr_auto] ${COLUMNS} gap-x-4 gap-y-2 px-5 py-3.5 items-center border-b border-line last:border-0`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className="grid place-items-center w-9 h-9 shrink-0 rounded-full bg-surface-sunken ring-1 ring-line text-xs font-semibold text-content-secondary">
          {initials(u.name)}
        </span>
        <div className="min-w-0 leading-tight">
          <div className="text-sm font-medium flex items-center gap-2">
            <span className="truncate">{u.name}</span>
            {isMe && (
              <span className="text-[0.6875rem] font-medium text-accent-content bg-accent-soft rounded px-1.5 py-px">
                You
              </span>
            )}
          </div>
          <div className="t-caption truncate mt-0.5">{u.email}</div>
        </div>
      </div>
      <div>
        {editable ? (
          <select
            value={u.role}
            onChange={(e) => onChangeRole(u.id, e.target.value as Role)}
            aria-label={`Role for ${u.name}`}
            className="input !h-8 !text-[0.8125rem]"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_NAME[r]}
              </option>
            ))}
          </select>
        ) : (
          <span className="inline-flex items-center gap-2 text-[0.8125rem] text-content-secondary">
            <span className={`w-1.5 h-1.5 rounded-full ${ROLE_DOT[u.role]}`} />
            {ROLE_NAME[u.role]}
          </span>
        )}
      </div>
      <div className="hidden sm:block t-caption">{formatDate(u.createdAt)}</div>
      <div className="hidden sm:flex justify-end">
        {editable && (
          <button
            onClick={() => onRemove(u.id)}
            className="btn btn-danger btn-icon btn-sm"
            title={`Delete ${u.name}`}
            aria-label={`Delete ${u.name}`}
          >
            <Trash2 />
          </button>
        )}
      </div>
    </div>
  );
}

function RowSkeleton() {
  return (
    <div className="px-5 py-4 flex items-center gap-3 border-b border-line last:border-0">
      <div className="skeleton w-9 h-9 rounded-full" />
      <div className="flex-1 space-y-2">
        <div className="skeleton h-4 w-1/4" />
        <div className="skeleton h-3 w-2/5" />
      </div>
    </div>
  );
}
