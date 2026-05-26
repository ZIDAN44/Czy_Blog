'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useConfirm } from '@/components/ConfirmDialog';

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
  const [keys, setKeys] = useState<KeyRow[]>([]);
  const [name, setName] = useState('');
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function load() {
    const { data } = await api<{ data: KeyRow[] }>('/api/v1/users/me/api-keys');
    setKeys(data);
  }
  useEffect(() => {
    load().catch(console.error);
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
    const r = await api<{ key: string }>('/api/v1/users/me/api-keys', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
    setNewKey(r.key);
    setName('');
    load();
  }

  async function revoke(id: string) {
    const ok = await confirm({
      title: 'Revoke this API key?',
      message: 'The consumer using this key will start failing immediately. This cannot be undone.',
      confirmLabel: 'Revoke key',
      tone: 'danger',
    });
    if (!ok) return;
    await api(`/api/v1/users/me/api-keys/${id}`, { method: 'DELETE' });
    load();
  }

  async function copyKey() {
    if (!newKey) return;
    await navigator.clipboard.writeText(newKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">API keys</h1>
        <p className="text-sm text-slate-500 mt-1 max-w-xl">
          Use these on your personal site to fetch posts via the{' '}
          <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-xs">x-api-key</code>{' '}
          header.
        </p>
      </header>

      <section className="card p-5 space-y-3">
        <h2 className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
          Create a new key
        </h2>
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. czy.dev production"
            className="input flex-1"
            onKeyDown={(e) => e.key === 'Enter' && create()}
          />
          <button onClick={create} disabled={!name.trim()} className="btn btn-primary">
            Create key
          </button>
        </div>
        {newKey && (
          <div className="rounded-xl p-4 text-sm bg-gradient-to-br from-amber-50 to-amber-50/40 border border-amber-200/60 animate-slideUp">
            <div className="flex items-start gap-3">
              <span className="grid place-items-center w-7 h-7 rounded-full bg-amber-500 text-white font-bold flex-shrink-0">
                !
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-amber-900">
                  Copy this key now as it won't be shown again.
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <code className="flex-1 bg-white border border-amber-200 rounded-lg p-2 text-xs font-mono break-all">
                    {newKey}
                  </code>
                  <button onClick={copyKey} className="btn btn-secondary text-xs">
                    {copied ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
                <button
                  className="text-xs mt-2 text-amber-700 hover:underline"
                  onClick={() => setNewKey(null)}
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="card divide-y divide-slate-100 overflow-hidden">
        {keys.map((k) => (
          <div key={k.id} className="flex items-center gap-3 px-5 py-4 text-sm">
            <span className="grid place-items-center w-9 h-9 rounded-lg bg-slate-100 text-slate-500 font-mono text-xs">
              ⚿
            </span>
            <div className="flex-1 min-w-0">
              <div className="font-medium flex items-center gap-2">
                <span className="truncate">{k.name}</span>
                {k.revokedAt && <span className="pill pill-archived">revoked</span>}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
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
        {keys.length === 0 && (
          <p className="px-5 py-10 text-sm text-slate-500 text-center">No keys yet.</p>
        )}
      </section>
    </div>
  );
}
