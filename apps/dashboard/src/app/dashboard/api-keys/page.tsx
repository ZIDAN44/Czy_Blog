'use client';
import { useEffect, useState } from 'react';
import { Check, Copy, KeyRound, Plus, TriangleAlert, X } from 'lucide-react';
import { api } from '@/lib/api';
import { useConfirm } from '@/components/ConfirmDialog';
import PageHeader from '@/components/PageHeader';
import { useToast } from '@/components/Toast';
import { errMsg, formatDate, relativeTime } from '@/lib/utils';

interface KeyRow {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export default function ApiKeysPage() {
  const confirm = useConfirm();
  const toast = useToast();
  const [keys, setKeys] = useState<KeyRow[]>([]);
  const [name, setName] = useState('');
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  async function load() {
    try {
      const { data } = await api<{ data: KeyRow[] }>('/api/v1/users/me/api-keys');
      setKeys(data);
    } catch (e) {
      toast({ title: 'Could not load keys', message: errMsg(e, ''), tone: 'error' });
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function create(e?: React.FormEvent) {
    e?.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      const r = await api<{ key: string }>('/api/v1/users/me/api-keys', {
        method: 'POST',
        body: JSON.stringify({ name }),
      });
      setNewKey(r.key);
      setCopied(false);
      setName('');
      load();
    } catch (e) {
      toast({ title: 'Could not create key', message: errMsg(e, ''), tone: 'error' });
    } finally {
      setCreating(false);
    }
  }

  async function revoke(id: string) {
    const ok = await confirm({
      title: 'Revoke this API key?',
      message: 'Anything using this key will start failing immediately. This cannot be undone.',
      confirmLabel: 'Revoke key',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await api(`/api/v1/users/me/api-keys/${id}`, { method: 'DELETE' });
      toast({ title: 'Key revoked', tone: 'success' });
      load();
    } catch (e) {
      toast({ title: 'Could not revoke key', message: errMsg(e, ''), tone: 'error' });
    }
  }

  async function copyKey() {
    if (!newKey) return;
    try {
      await navigator.clipboard.writeText(newKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast({
        title: 'Could not copy',
        message: 'Select the key and copy it manually.',
        tone: 'warning',
      });
    }
  }

  const active = keys.filter((k) => !k.revokedAt);
  const revoked = keys.filter((k) => k.revokedAt);

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="API keys"
        description="Read-only access to published posts through the Content API."
      />

      <section className="card p-5">
        <h2 className="t-heading">Create a key</h2>
        <p className="t-caption mt-1">
          Name it after where it will be used, so you know what breaks if you revoke it.
        </p>
        <form onSubmit={create} className="mt-4 flex flex-col sm:flex-row gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Portfolio site (production)"
            aria-label="Name for the new key"
            className="input flex-1"
          />
          <button disabled={!name.trim() || creating} className="btn btn-primary">
            <Plus /> {creating ? 'Creating…' : 'Create key'}
          </button>
        </form>

        {newKey && (
          <div className="mt-4 rounded-lg ring-1 ring-warning/40 bg-warning-soft p-4 animate-slideUp">
            <div className="flex items-start gap-3">
              <TriangleAlert className="w-[18px] h-[18px] text-warning-content shrink-0 mt-px" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-warning-content">
                  Copy this key now. It won&apos;t be shown again.
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <code className="flex-1 min-w-0 bg-surface text-content ring-1 ring-line rounded-md px-3 py-2 text-xs font-mono break-all">
                    {newKey}
                  </code>
                  <button onClick={copyKey} className="btn btn-secondary btn-sm">
                    {copied ? <Check /> : <Copy />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
              <button
                onClick={() => setNewKey(null)}
                className="btn btn-ghost btn-icon btn-sm -mt-1 -mr-1"
                aria-label="Dismiss"
              >
                <X />
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="t-label mb-3 px-1">Active keys</h2>
        <div className="card overflow-hidden">
          {loading &&
            [0, 1].map((i) => (
              <div
                key={i}
                className="px-5 py-4 flex items-center gap-3 border-b border-line last:border-0"
              >
                <div className="skeleton w-9 h-9 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-4 w-1/4" />
                  <div className="skeleton h-3 w-2/5" />
                </div>
              </div>
            ))}
          {!loading && active.length === 0 && (
            <div className="px-5 py-12 text-center">
              <span className="mx-auto grid place-items-center w-11 h-11 rounded-xl bg-surface-sunken ring-1 ring-line text-content-tertiary">
                <KeyRound className="w-5 h-5" />
              </span>
              <p className="t-heading mt-4">No active keys</p>
              <p className="t-secondary mt-1">
                Create one above to read your posts from another app.
              </p>
            </div>
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

function KeyItem({ k, onRevoke }: { k: KeyRow; onRevoke?: () => void }) {
  return (
    <div className="flex items-center gap-3 px-5 py-4 border-b border-line last:border-0">
      <span className="grid place-items-center w-9 h-9 shrink-0 rounded-lg bg-surface-sunken ring-1 ring-line text-content-tertiary">
        <KeyRound className="w-4 h-4" />
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{k.name}</div>
        <div className="t-caption mt-0.5 truncate">
          <code className="font-mono">{k.prefix}…</code> · created {formatDate(k.createdAt)}
          {k.revokedAt
            ? ` · revoked ${relativeTime(k.revokedAt)}`
            : k.lastUsedAt
              ? ` · used ${relativeTime(k.lastUsedAt)}`
              : ' · never used'}
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
