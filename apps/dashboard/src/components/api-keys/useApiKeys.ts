'use client';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { errMsg } from '@/lib/utils';
import { useConfirm } from '@/components/ConfirmDialog';
import { useToast } from '@/components/toast';

export interface KeyRow {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

/** The signed-in user's Content API keys. */
export function useApiKeys() {
  const confirm = useConfirm();
  const toast = useToast();
  const [keys, setKeys] = useState<KeyRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const { data } = await api<{ data: KeyRow[] }>('/api/v1/users/me/api-keys');
      setKeys(data);
    } catch (e) {
      toast({ title: 'Could not load keys', message: errMsg(e, ''), tone: 'error' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  /** Returns the full secret, which the API shows exactly once; null on failure. */
  async function create(name: string): Promise<string | null> {
    try {
      const r = await api<{ key: string }>('/api/v1/users/me/api-keys', {
        method: 'POST',
        body: JSON.stringify({ name }),
      });
      load();
      return r.key;
    } catch (e) {
      toast({ title: 'Could not create key', message: errMsg(e, ''), tone: 'error' });
      return null;
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

  return {
    active: keys.filter((k) => !k.revokedAt),
    revoked: keys.filter((k) => k.revokedAt),
    loading,
    create,
    revoke,
  };
}
