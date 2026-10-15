'use client';
import { useCallback, useEffect, useState } from 'react';
import { api, type Role } from '@/lib/api';
import { ROLE_NAME } from '@/lib/roles';
import { errMsg } from '@/lib/utils';
import { useConfirm, useNotify } from '@/components/ConfirmDialog';
import { useToast } from '@/components/toast';

export interface UserRow {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt: string;
}

export interface NewUser {
  email: string;
  name: string;
  password: string;
  role: Role | '';
}

// The users roster and every change to it, with the confirmations each one needs.
export function useUsers() {
  const confirm = useConfirm();
  const notify = useNotify();
  const toast = useToast();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const { data } = await api<{ data: UserRow[] }>('/api/v1/users');
      setUsers(data);
    } catch (e) {
      toast({ title: 'Could not load users', message: errMsg(e, ''), tone: 'error' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  /** Throws on failure so the form can show the error inline. */
  async function create(user: NewUser) {
    await api('/api/v1/users', { method: 'POST', body: JSON.stringify(user) });
    toast({ title: 'Account created', message: `${user.name} can sign in now.`, tone: 'success' });
    load();
  }

  async function changeRole(id: string, role: Role) {
    const user = users.find((u) => u.id === id);
    if (!user || user.role === role) return;
    const ok = await confirm({
      title: 'Change role?',
      message: `${user.name} will change from ${ROLE_NAME[user.role]} to ${ROLE_NAME[role]}. Their permissions update immediately.`,
      confirmLabel: 'Change role',
      tone: 'warning',
    });
    if (!ok) return;
    try {
      await api(`/api/v1/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) });
      toast({
        title: 'Role updated',
        message: `${user.name} is now ${ROLE_NAME[role]}.`,
        tone: 'success',
      });
      load();
    } catch (e) {
      notify({
        title: 'Failed to change role',
        message: errMsg(e, 'Failed to change role'),
        tone: 'danger',
      });
    }
  }

  async function remove(id: string) {
    const user = users.find((u) => u.id === id);
    const ok = await confirm({
      title: 'Delete this user?',
      message: `${user?.name ?? 'This user'} will be permanently deleted. Their posts will be re-assigned to you. This cannot be undone.`,
      confirmLabel: 'Delete user',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await api(`/api/v1/users/${id}`, { method: 'DELETE' });
      toast({ title: 'User deleted', message: user?.name, tone: 'success' });
      load();
    } catch (e) {
      notify({
        title: 'Failed to delete user',
        message: errMsg(e, 'Failed to delete user'),
        tone: 'danger',
      });
    }
  }

  return { users, loading, create, changeRole, remove };
}
