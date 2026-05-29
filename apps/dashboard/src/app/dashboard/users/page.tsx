'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, currentUser, type Role } from '@/lib/api';
import { useConfirm, useNotify } from '@/components/ConfirmDialog';
import { errMsg, initials } from '@/lib/utils';

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
  EDITOR: 'Reviews, edits, and publishes any post. Manages categories.',
  AUTHOR: 'Creates, edits, and publishes their own posts.',
  CONTRIBUTOR: 'Writes drafts. An editor or admin must approve and publish.',
};

const ROLE_COLOR: Record<Role, string> = {
  SUPER_ADMIN: 'bg-violet-100 text-violet-700 border-violet-200',
  EDITOR: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  AUTHOR: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  CONTRIBUTOR: 'bg-slate-100 text-slate-700 border-slate-200',
};

export default function UsersPage() {
  const router = useRouter();
  const confirm = useConfirm();
  const notify = useNotify();
  const me = currentUser();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    email: '',
    name: '',
    password: '',
    role: '' as Role | '',
  });
  const [busy, setBusy] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    if (!me) return;
    if (me.role !== 'SUPER_ADMIN' && me.role !== 'EDITOR') router.replace('/dashboard');
  }, [me, router]);

  const isSuper = me?.role === 'SUPER_ADMIN';

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
    const ok = await confirm({
      title: 'Create this account?',
      message: `${form.name} <${form.email}> will be added as ${form.role}. They can sign in immediately with the password you set.`,
      confirmLabel: 'Create account',
      tone: 'success',
    });
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      await api('/api/v1/users', { method: 'POST', body: JSON.stringify(form) });
      setForm({ email: '', name: '', password: '', role: '' });
      setShowCreate(false);
      load();
    } catch (e) {
      setError(errMsg(e, 'Failed to create user'));
    } finally {
      setBusy(false);
    }
  }

  async function changeRole(id: string, role: Role) {
    const user = users.find((u) => u.id === id);
    if (user && user.role === role) return;
    const ok = await confirm({
      title: 'Change role?',
      message: `${user?.name ?? 'This user'} will be changed from ${user?.role} to ${role}. Their permissions will update immediately.`,
      confirmLabel: 'Change role',
      tone: 'warning',
    });
    if (!ok) return;
    try {
      await api(`/api/v1/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) });
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
      load();
    } catch (e) {
      notify({
        title: 'Failed to delete user',
        message: errMsg(e, 'Failed to delete user'),
        tone: 'danger',
      });
    }
  }

  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Users</h1>
          <p className="text-sm text-slate-500 mt-1 max-w-xl">
            {isSuper
              ? 'Create accounts for editors, authors, and contributors. Assign roles based on what each person should do.'
              : 'You can see all users on the platform. Only a super admin can create or change accounts.'}
          </p>
        </div>
        {isSuper && (
          <button onClick={() => setShowCreate((v) => !v)} className="btn btn-primary">
            <span aria-hidden>+</span> {showCreate ? 'Close' : 'Add user'}
          </button>
        )}
      </header>

      <section className="card p-5">
        <h2 className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-3">
          Role legend
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          {ROLES.map((r) => (
            <div key={r} className="flex items-start gap-3">
              <span
                className={`pill border ${ROLE_COLOR[r]} flex-shrink-0`}
                style={{ textTransform: 'none' }}
              >
                {r.replace('_', ' ')}
              </span>
              <p className="text-slate-600">{ROLE_DESCRIPTIONS[r]}</p>
            </div>
          ))}
        </div>
      </section>

      {isSuper && showCreate && (
        <section className="card p-5 space-y-3 animate-slideUp">
          <h2 className="font-semibold">Create user</h2>
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <form
            onSubmit={createUser}
            className="grid grid-cols-1 md:grid-cols-5 gap-2"
            autoComplete="off"
            data-form-type="other"
            data-1p-ignore
            data-lpignore="true"
            data-bwignore="true"
          >
            {/* Decoy fields to throw off aggressive password managers */}
            <input
              type="text"
              name="username"
              autoComplete="username"
              tabIndex={-1}
              aria-hidden="true"
              className="hidden"
            />
            <input
              type="password"
              name="password"
              autoComplete="new-password"
              tabIndex={-1}
              aria-hidden="true"
              className="hidden"
            />

            <input
              className="input md:col-span-1"
              placeholder="Name"
              name="cz-create-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              autoComplete="off"
              data-1p-ignore
              data-lpignore="true"
              data-bwignore="true"
              data-form-type="other"
            />
            <input
              className="input md:col-span-2"
              type="text"
              inputMode="email"
              placeholder="Email"
              name="cz-create-account-handle"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              autoComplete="off"
              data-1p-ignore
              data-lpignore="true"
              data-bwignore="true"
              data-form-type="other"
            />
            <input
              className="input md:col-span-1 font-mono tracking-widest"
              type="text"
              placeholder="Password (8+)"
              name="cz-create-secret-token"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              minLength={8}
              required
              autoComplete="off"
              data-1p-ignore
              data-lpignore="true"
              data-bwignore="true"
              data-form-type="other"
              style={{ WebkitTextSecurity: 'disc', textSecurity: 'disc' } as React.CSSProperties}
            />
            <select
              className="input"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
              required
            >
              <option value="" disabled>
                Select role…
              </option>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <button disabled={busy || !form.role} className="btn btn-primary md:col-span-5">
              {busy ? 'Creating…' : 'Create account'}
            </button>
          </form>
        </section>
      )}

      <section className="card divide-y divide-slate-100 overflow-hidden">
        {users.map((u) => (
          <div key={u.id} className="px-5 py-4 flex items-center gap-4 text-sm">
            <span className="grid place-items-center w-9 h-9 rounded-full bg-gradient-to-br from-slate-200 to-slate-100 text-slate-700 text-xs font-semibold border border-slate-200">
              {initials(u.name)}
            </span>
            <div className="flex-1 min-w-0">
              <div className="font-medium flex items-center gap-2">
                <span className="truncate">{u.name}</span>
                {u.id === me?.id && (
                  <span className="text-[10px] uppercase tracking-widest text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-full px-1.5 py-0.5">
                    you
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                {u.email} · joined {new Date(u.createdAt).toLocaleDateString()}
              </div>
            </div>
            {isSuper ? (
              <select
                value={u.role}
                onChange={(e) => changeRole(u.id, e.target.value as Role)}
                className={`text-xs font-mono px-2.5 py-1 rounded-lg border ${ROLE_COLOR[u.role]}`}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            ) : (
              <span
                className={`pill border ${ROLE_COLOR[u.role]}`}
                style={{ textTransform: 'none' }}
              >
                {u.role.replace('_', ' ')}
              </span>
            )}
            {isSuper && u.id !== me?.id && (
              <button onClick={() => remove(u.id)} className="btn btn-danger text-xs">
                Delete
              </button>
            )}
          </div>
        ))}
        {users.length === 0 && (
          <p className="px-5 py-10 text-sm text-slate-500 text-center">No users.</p>
        )}
      </section>
    </div>
  );
}
