'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, currentUser, type Role } from '@/lib/api';

interface UserRow {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt: string;
}

const ROLES: Role[] = ['SUPER_ADMIN', 'EDITOR', 'AUTHOR', 'CONTRIBUTOR'];

const ROLE_DESCRIPTIONS: Record<Role, string> = {
  SUPER_ADMIN: 'Full access. Manages users, roles, and site settings.',
  EDITOR: 'Reviews, edits, and publishes any post. Manages categories. No user management.',
  AUTHOR: 'Creates, edits, and publishes their own posts.',
  CONTRIBUTOR: 'Writes drafts. An editor or admin must approve and publish.',
};

export default function UsersPage() {
  const router = useRouter();
  const me = currentUser();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    email: '',
    name: '',
    password: '',
    role: 'CONTRIBUTOR' as Role,
  });
  const [busy, setBusy] = useState(false);

  // Guard: only EDITOR+ can view this page at all
  useEffect(() => {
    if (!me) return;
    if (me.role !== 'SUPER_ADMIN' && me.role !== 'EDITOR') router.replace('/dashboard');
  }, [me, router]);

  const isSuper = me?.role === 'SUPER_ADMIN';

  const errMsg = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);

  async function load() {
    try {
      const { data } = await api<{ data: UserRow[] }>('/api/v1/users');
      setUsers(data);
    } catch (e) {
      setError(errMsg(e, 'Failed to load users'));
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api('/api/v1/users', { method: 'POST', body: JSON.stringify(form) });
      setForm({ email: '', name: '', password: '', role: 'CONTRIBUTOR' });
      load();
    } catch (e) {
      setError(errMsg(e, 'Failed to create user'));
    } finally {
      setBusy(false);
    }
  }

  async function changeRole(id: string, role: Role) {
    try {
      await api(`/api/v1/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) });
      load();
    } catch (e) {
      alert(errMsg(e, 'Failed to change role'));
    }
  }

  async function remove(id: string) {
    if (!confirm('Delete this user? Their posts will be re-assigned to you.')) return;
    try {
      await api(`/api/v1/users/${id}`, { method: 'DELETE' });
      load();
    } catch (e) {
      alert(errMsg(e, 'Failed to delete user'));
    }
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold">Users</h1>
        <p className="text-sm text-slate-500 mt-1">
          {isSuper
            ? 'Create accounts for editors, authors, and contributors. Assign roles based on what each person should do.'
            : 'You can see all users on the platform. Only a super admin can create or change accounts.'}
        </p>
      </header>

      {/* Role legend — visible to everyone on this page */}
      <section className="bg-white border rounded-xl p-4">
        <h2 className="font-semibold text-sm uppercase text-slate-500 mb-2">Roles</h2>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          {ROLES.map((r) => (
            <div key={r}>
              <dt className="font-mono text-xs font-bold">{r}</dt>
              <dd className="text-slate-600">{ROLE_DESCRIPTIONS[r]}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Create user — super admin only */}
      {isSuper && (
        <section className="bg-white border rounded-xl p-4 space-y-3">
          <h2 className="font-semibold">Create user</h2>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <form onSubmit={createUser} className="grid grid-cols-1 md:grid-cols-5 gap-2">
            <input
              className="border rounded-lg px-2 py-1.5 text-sm md:col-span-1"
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <input
              className="border rounded-lg px-2 py-1.5 text-sm md:col-span-2"
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
            <input
              className="border rounded-lg px-2 py-1.5 text-sm md:col-span-1"
              type="password"
              placeholder="Password (8+)"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              minLength={8}
              required
            />
            <select
              className="border rounded-lg px-2 py-1.5 text-sm"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <button
              disabled={busy}
              className="md:col-span-5 bg-slate-900 text-white rounded-lg py-2 text-sm disabled:opacity-60"
            >
              {busy ? 'Creating…' : 'Create account'}
            </button>
          </form>
        </section>
      )}

      {/* User list */}
      <section className="bg-white border rounded-xl divide-y">
        {users.map((u) => (
          <div key={u.id} className="px-4 py-3 flex items-center gap-3 text-sm">
            <div className="flex-1">
              <div className="font-medium">
                {u.name} {u.id === me?.id && <span className="text-xs text-slate-400">(you)</span>}
              </div>
              <div className="text-xs text-slate-500">
                {u.email} · joined {new Date(u.createdAt).toLocaleDateString()}
              </div>
            </div>
            {isSuper ? (
              <select
                value={u.role}
                onChange={(e) => changeRole(u.id, e.target.value as Role)}
                className="border rounded-lg px-2 py-1 text-xs font-mono"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            ) : (
              <span className="font-mono text-xs uppercase text-slate-500">{u.role}</span>
            )}
            {isSuper && u.id !== me?.id && (
              <button onClick={() => remove(u.id)} className="text-xs text-red-600 hover:underline">
                Delete
              </button>
            )}
          </div>
        ))}
        {users.length === 0 && <p className="px-4 py-6 text-sm text-slate-500">No users.</p>}
      </section>
    </div>
  );
}
