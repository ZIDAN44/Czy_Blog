'use client';
import { KeyRound } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import CreateKeyCard from '@/components/api-keys/CreateKeyCard';
import KeyItem from '@/components/api-keys/KeyItem';
import { useApiKeys } from '@/components/api-keys/useApiKeys';
import { EmptyState, ListSkeleton } from '@/components/common/ListStates';

export default function ApiKeysPage() {
  const { active, revoked, loading, create, revoke } = useApiKeys();

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="API keys"
        description="Read-only access to published posts through the Content API."
      />

      <CreateKeyCard onCreate={create} />

      <section className="mt-8">
        <h2 className="t-label mb-3 px-1">Active keys</h2>
        <div className="card overflow-hidden">
          {loading && <ListSkeleton rows={2} pill={false} />}
          {!loading && active.length === 0 && (
            <EmptyState
              icon={KeyRound}
              title="No active keys"
              hint="Create one above to read your posts from another app."
            />
          )}
          {active.map((k) => (
            <KeyItem key={k.id} k={k} onRevoke={() => revoke(k.id)} />
          ))}
        </div>
      </section>

      {revoked.length > 0 && (
        <section className="mt-8">
          <h2 className="t-label mb-3 px-1">Revoked</h2>
          <div className="card overflow-hidden opacity-75">
            {revoked.map((k) => (
              <KeyItem key={k.id} k={k} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
