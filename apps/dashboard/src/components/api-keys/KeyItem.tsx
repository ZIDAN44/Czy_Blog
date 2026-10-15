import { KeyRound } from 'lucide-react';
import { formatDate, relativeTime } from '@/lib/utils';
import type { KeyRow } from './useApiKeys';

function usage(k: KeyRow): string {
  if (k.revokedAt) return ` · revoked ${relativeTime(k.revokedAt)}`;
  if (k.lastUsedAt) return ` · used ${relativeTime(k.lastUsedAt)}`;
  return ' · never used';
}

/** One key. Without `onRevoke` it renders read-only (already revoked). */
export default function KeyItem({ k, onRevoke }: { k: KeyRow; onRevoke?: () => void }) {
  return (
    <div className="flex items-center gap-3 px-5 py-4 border-b border-line last:border-0">
      <span className="grid place-items-center w-9 h-9 shrink-0 rounded-lg bg-surface-sunken ring-1 ring-line text-content-tertiary">
        <KeyRound className="w-4 h-4" />
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{k.name}</div>
        <div className="t-caption mt-0.5 truncate">
          <code className="font-mono">{k.prefix}…</code> · created {formatDate(k.createdAt)}
          {usage(k)}
        </div>
      </div>
      {onRevoke && (
        <button onClick={onRevoke} className="btn btn-danger btn-sm">
          Revoke
        </button>
      )}
    </div>
  );
}
