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
      message: `A new key named "${name.trim()}" will be created. The full key is shown only once — make sure to copy it.`,
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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">API keys</h1>
      <p className="text-sm text-slate-500">
        Use these on your personal site to fetch posts via{' '}
        <code className="bg-slate-100 px-1 rounded">x-api-key</code>.
      </p>

      <div className="bg-white border rounded-xl p-4 space-y-3">
        <h2 className="font-semibold">Create a new key</h2>
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. czy.dev production"
            className="flex-1 border rounded-lg px-3 py-2 text-sm"
          />
          <button onClick={create} className="bg-slate-900 text-white rounded-lg px-3 py-2 text-sm">
            Create
          </button>
        </div>
        {newKey && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
            <p className="font-medium mb-1">Copy this key now — it won't be shown again.</p>
            <code className="block break-all bg-white border rounded p-2 text-xs">{newKey}</code>
            <button className="text-xs mt-2 underline" onClick={() => setNewKey(null)}>
              Dismiss
            </button>
          </div>
        )}
      </div>

      <div className="bg-white border rounded-xl divide-y">
        {keys.map((k) => (
          <div key={k.id} className="flex items-center gap-3 px-4 py-3 text-sm">
            <div className="flex-1">
              <div className="font-medium">{k.name}</div>
              <div className="text-xs text-slate-500">
                <code>{k.prefix}…</code> · created {new Date(k.createdAt).toLocaleDateString()}
                {k.lastUsedAt && ` · last used ${new Date(k.lastUsedAt).toLocaleString()}`}
              </div>
            </div>
            {k.revokedAt ? (
              <span className="text-xs text-red-600">Revoked</span>
            ) : (
              <button onClick={() => revoke(k.id)} className="text-xs text-red-600 hover:underline">
                Revoke
              </button>
            )}
          </div>
        ))}
        {keys.length === 0 && <p className="px-4 py-6 text-sm text-slate-500">No keys yet.</p>}
      </div>
    </div>
  );
}
