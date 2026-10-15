'use client';
import { useState } from 'react';
import type { Role } from '@/lib/api';
import { ROLES, ROLE_DESCRIPTION, ROLE_NAME } from '@/lib/roles';
import { errMsg } from '@/lib/utils';
import { Modal } from '@/components/overlay';
import type { NewUser } from './useUsers';

const EMPTY: NewUser = { email: '', name: '', password: '', role: '' };

// These fields describe someone else's account; keep password managers from
// offering (or saving) the admin's own credentials into them.
const NO_AUTOFILL = {
  autoComplete: 'off',
  'data-1p-ignore': true,
  'data-lpignore': 'true',
} as const;

export default function CreateUserModal({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  /** Rejects with the API's message on failure. */
  onCreate: (user: NewUser) => Promise<void>;
}) {
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onCreate(form);
      setForm(EMPTY);
      onClose();
    } catch (err) {
      setError(errMsg(err, 'Failed to create user'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} labelledBy="create-user-title" dismissOnScrim={false}>
      <form onSubmit={submit} data-form-type="other" data-bwignore="true" {...NO_AUTOFILL}>
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

        <UserFields form={form} onChange={setForm} />

        {error && <p className="note note-danger mt-4">{error}</p>}

        <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button disabled={busy || !form.role} className="btn btn-primary">
            {busy ? 'Creating…' : 'Create account'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function UserFields({ form, onChange }: { form: NewUser; onChange: (f: NewUser) => void }) {
  const field =
    (key: keyof NewUser) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      onChange({ ...form, [key]: e.target.value });
  return (
    <div className="mt-5 space-y-4">
      <label className="block">
        <span className="field-label">Name</span>
        <input
          data-autofocus
          className="input"
          name="cz-create-name"
          value={form.name}
          onChange={field('name')}
          required
          {...NO_AUTOFILL}
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
          onChange={field('email')}
          required
          {...NO_AUTOFILL}
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
            onChange={field('password')}
            minLength={8}
            maxLength={72}
            required
            style={{ WebkitTextSecurity: 'disc' } as React.CSSProperties}
            {...NO_AUTOFILL}
          />
        </label>
        <label className="block">
          <span className="field-label">Role</span>
          <select className="input" value={form.role} onChange={field('role')} required>
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
      {form.role && <p className="t-caption -mt-1">{ROLE_DESCRIPTION[form.role as Role]}</p>}
    </div>
  );
}
