'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, UserPlus } from 'lucide-react';
import { api, currentUser, type Role } from '@/lib/api';
import { useConfirm, useNotify } from '@/components/ConfirmDialog';
import { Modal } from '@/components/Overlay';
import PageHeader from '@/components/PageHeader';
import { useToast } from '@/components/Toast';
import { errMsg, formatDate, initials } from '@/lib/utils';

interface UserRow {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt: string;
}

const ROLES: Role[] = ['SUPER_ADMIN', 'EDITOR', 'AUTHOR', 'CONTRIBUTOR'];

const ROLE_NAME: Record<Role, string> = {
  SUPER_ADMIN: 'Super admin',
  EDITOR: 'Editor',
  AUTHOR: 'Author',
  CONTRIBUTOR: 'Contributor',
};

const ROLE_DESCRIPTIONS: Record<Role, string> = {
  SUPER_ADMIN: 'Full access. Manages users, roles, and site settings.',
  EDITOR: 'Reviews, edits, and publishes any post. Manages categories.',
  AUTHOR: 'Creates, edits, and publishes their own posts.',
  CONTRIBUTOR: 'Writes drafts. An editor or admin must approve and publish.',
};

const ROLE_DOT: Record<Role, string> = {
  SUPER_ADMIN: 'bg-accent',
  EDITOR: 'bg-info',
  AUTHOR: 'bg-success',
  CONTRIBUTOR: 'bg-content-tertiary',
};

const EMPTY_FORM = { email: '', name: '', password: '', role: '' as Role | '' };

export default function UsersPage() {
  const router = useRouter();
  const confirm = useConfirm();
  const notify = useNotify();
  const toast = useToast();
  const me = currentUser();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
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
      toast({ title: 'Could not load users', message: errMsg(e, ''), tone: 'error' });
    } finally {
      setLoading(false);
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
      toast({
        title: 'Account created',
        message: `${form.name} can sign in now.`,
        tone: 'success',
      });
      setForm(EMPTY_FORM);
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
      message: `${user?.name ?? 'This user'} will change from ${user ? ROLE_NAME[user.role] : ''} to ${ROLE_NAME[role]}. Their permissions update immediately.`,
      confirmLabel: 'Change role',
      tone: 'warning',
    });
    if (!ok) return;
    try {
      await api(`/api/v1/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) });
      toast({
        title: 'Role updated',
        message: `${user?.name ?? 'User'} is now ${ROLE_NAME[role]}.`,
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

  return (
    <div>
      <PageHeader
        title="Users"
        description={
          isSuper
            ? 'Invite people and give each one the access they need.'
            : 'Everyone with access to this blog. Only a super admin can change accounts.'
        }
        actions={
          isSuper && (
            <button onClick={() => setShowCreate(true)} className="btn btn-primary">
              <UserPlus /> Add user
            </button>
          )
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_17rem] items-start">
        <section className="card overflow-hidden">
          <div className="hidden sm:grid grid-cols-[1fr_10.5rem_6rem_2.5rem] gap-4 px-5 h-10 items-center border-b border-line bg-surface-sunken/50 t-label">
            <span>Member</span>
            <span>Role</span>
            <span>Joined</span>
            <span />
          </div>
          {loading &&
            [0, 1, 2].map((i) => (
              <div
                key={i}
                className="px-5 py-4 flex items-center gap-3 border-b border-line last:border-0"
              >
                <div className="skeleton w-9 h-9 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-4 w-1/4" />
                  <div className="skeleton h-3 w-2/5" />
                </div>
              </div>
            ))}
          {users.map((u) => (
            <div
              key={u.id}
              className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_10.5rem_6rem_2.5rem] gap-x-4 gap-y-2 px-5 py-3.5 items-center border-b border-line last:border-0"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="grid place-items-center w-9 h-9 shrink-0 rounded-full bg-surface-sunken ring-1 ring-line text-xs font-semibold text-content-secondary">
                  {initials(u.name)}
                </span>
                <div className="min-w-0 leading-tight">
                  <div className="text-sm font-medium flex items-center gap-2">
                    <span className="truncate">{u.name}</span>
                    {u.id === me?.id && (
                      <span className="text-[0.6875rem] font-medium text-accent-content bg-accent-soft rounded px-1.5 py-px">
                        You
                      </span>
                    )}
                  </div>
                  <div className="t-caption truncate mt-0.5">{u.email}</div>
                </div>
              </div>
              <div>
                {isSuper && u.id !== me?.id ? (
                  <select
                    value={u.role}
                    onChange={(e) => changeRole(u.id, e.target.value as Role)}
                    aria-label={`Role for ${u.name}`}
                    className="input !h-8 !text-[0.8125rem]"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_NAME[r]}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="inline-flex items-center gap-2 text-[0.8125rem] text-content-secondary">
                    <span className={`w-1.5 h-1.5 rounded-full ${ROLE_DOT[u.role]}`} />
                    {ROLE_NAME[u.role]}
                  </span>
                )}
              </div>
              <div className="hidden sm:block t-caption">{formatDate(u.createdAt)}</div>
              <div className="hidden sm:flex justify-end">
                {isSuper && u.id !== me?.id && (
                  <button
                    onClick={() => remove(u.id)}
                    className="btn btn-danger btn-icon btn-sm"
                    title={`Delete ${u.name}`}
                    aria-label={`Delete ${u.name}`}
                  >
                    <Trash2 />
                  </button>
                )}
              </div>
            </div>
          ))}
          {!loading && users.length === 0 && (
            <p className="px-5 py-12 t-secondary text-center">No users yet.</p>
          )}
        </section>

        <aside className="card p-4">
          <h2 className="text-[0.8125rem] font-semibold mb-3">Roles</h2>
          <dl className="space-y-3.5">
            {ROLES.map((r) => (
              <div key={r}>
                <dt className="flex items-center gap-2 text-[0.8125rem] font-medium">
                  <span className={`w-1.5 h-1.5 rounded-full ${ROLE_DOT[r]}`} />
                  {ROLE_NAME[r]}
                </dt>
                <dd className="t-caption mt-0.5 pl-3.5">{ROLE_DESCRIPTIONS[r]}</dd>
              </div>
            ))}
          </dl>
        </aside>
      </div>

      <Modal
        open={isSuper && showCreate}
        onClose={() => setShowCreate(false)}
        labelledBy="create-user-title"
        dismissOnScrim={false}
      >
        <form
          onSubmit={createUser}
          autoComplete="off"
          data-form-type="other"
          data-1p-ignore
          data-lpignore="true"
          data-bwignore="true"
        >
          {/* Decoys to keep aggressive password managers off the real fields. */}
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
          <h2 id="create-user-title" className="t-heading">
            Add a user
          </h2>
          <p className="t-caption mt-1">They can sign in right away with the password you set.</p>

          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="field-label">Name</span>
              <input
                data-autofocus
                className="input"
                name="cz-create-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                autoComplete="off"
                data-1p-ignore
                data-lpignore="true"
              />
            </label>
            <label className="block">
              <span className="field-label">Email</span>
              <input
                className="input"
                type="text"
                inputMode="email"
                name="cz-create-account-handle"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                autoComplete="off"
                data-1p-ignore
                data-lpignore="true"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="field-label">Temporary password</span>
                <input
                  className="input font-mono"
                  type="text"
                  name="cz-create-secret-token"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  minLength={8}
                  maxLength={72}
                  required
                  autoComplete="off"
                  data-1p-ignore
                  data-lpignore="true"
                  style={{ WebkitTextSecurity: 'disc' } as React.CSSProperties}
                />
              </label>
              <label className="block">
                <span className="field-label">Role</span>
                <select
                  className="input"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
                  required
                >
                  <option value="" disabled>
                    Choose…
                  </option>
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_NAME[r]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {form.role && <p className="t-caption -mt-1">{ROLE_DESCRIPTIONS[form.role]}</p>}
          </div>

          {error && <p className="note note-danger mt-4">{error}</p>}

          <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button disabled={busy || !form.role} className="btn btn-primary">
              {busy ? 'Creating…' : 'Create account'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
