'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useConfirm } from '@/components/ConfirmDialog';
import { useToast } from '@/components/Toast';
import { errMsg } from '@/lib/utils';

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

  async function create() {
    if (!name.trim()) return;
    const ok = await confirm({
      title: 'Create API key?',
      message: `A new key named "${name.trim()}" will be created. The full key is shown only once so make sure to copy it.`,
      confirmLabel: 'Create key',
      tone: 'default',
    });
    if (!ok) return;
    try {
      const r = await api<{ key: string }>('/api/v1/users/me/api-keys', {
        method: 'POST',
        body: JSON.stringify({ name }),
      });
      setNewKey(r.key);
      setName('');
      load();
    } catch (e) {
      toast({ title: 'Could not create key', message: errMsg(e, ''), tone: 'error' });
    }
  }

  async function revoke(id: string) {
    const ok = await confirm({
      title: 'Revoke this API key?',
      message: 'The consumer using this key will start failing immediately. This cannot be undone.',
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

  return (
    <div className="space-y-8">
      <header>
        <h1 className="t-display">API keys</h1>
        <p className="t-secondary mt-1 max-w-xl">
          Read-only access to published posts through the Content API.
        </p>
      </header>

      <section className="card p-5 space-y-3">
        <h2 className="t-label">Create a new key</h2>
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. czy.dev production"
            aria-label="Name for the new key"
            className="input flex-1"
            onKeyDown={(e) => e.key === 'Enter' && create()}
          />
          <button onClick={create} disabled={!name.trim()} className="btn btn-primary">
            Create key
          </button>
        </div>
        {newKey && (
          <div className="note note-warning p-4 animate-slideUp">
            <div className="flex items-start gap-3">
              <span className="grid place-items-center w-7 h-7 rounded-full bg-warning text-on-inverse font-bold flex-shrink-0">
                !
              </span>
              <div className="flex-1 min-w-0">
                <p className="t-subheading">Copy this key now — it will not be shown again.</p>
                <div className="mt-2 flex items-center gap-2">
                  <code className="flex-1 bg-surface text-content border border-line rounded-lg p-2 text-xs font-mono break-all">
                    {newKey}
                  </code>
                  <button onClick={copyKey} className="btn btn-secondary text-xs">
                    {copied ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
                <button
                  className="text-xs mt-2 underline underline-offset-2"
                  onClick={() => setNewKey(null)}
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="card divide-y divide-line overflow-hidden">
        {loading &&
          [0, 1].map((i) => (
            <div key={i} className="px-5 py-4 flex items-center gap-3">
              <div className="skeleton w-9 h-9 rounded-lg" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-4 w-1/4" />
                <div className="skeleton h-3 w-2/5" />
              </div>
            </div>
          ))}
        {keys.map((k) => (
          <div key={k.id} className="flex items-center gap-3 px-5 py-4">
            <span className="grid place-items-center w-9 h-9 rounded-lg bg-surface-sunken text-content-secondary font-mono text-xs">
              ⚿
            </span>
            <div className="flex-1 min-w-0">
              <div className="t-subheading flex items-center gap-2">
                <span className="truncate">{k.name}</span>
                {k.revokedAt && <span className="pill pill-archived">revoked</span>}
              </div>
              <div className="t-caption mt-0.5 truncate">
                <code className="font-mono">{k.prefix}…</code> · created{' '}
                {new Date(k.createdAt).toLocaleDateString()}
                {k.lastUsedAt && ` · last used ${new Date(k.lastUsedAt).toLocaleString()}`}
              </div>
            </div>
            {!k.revokedAt && (
              <button onClick={() => revoke(k.id)} className="btn btn-danger text-xs">
                Revoke
              </button>
            )}
          </div>
        ))}
        {!loading && keys.length === 0 && (
          <div className="px-5 py-12 text-center">
            <p className="t-body text-content-secondary">No keys yet.</p>
            <p className="t-caption mt-1">
              Create one above to read your published posts from another app.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
