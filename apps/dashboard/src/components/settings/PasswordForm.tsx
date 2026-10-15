'use client';
import { useState } from 'react';
import { changePassword, setSession } from '@/lib/api';
import { errMsg } from '@/lib/utils';
import { useToast } from '@/components/toast';

const MIN = 8;
const MAX = 72; // bcrypt ignores bytes past 72

export default function PasswordForm() {
  const toast = useToast();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Validated as you type, not sprung on you at submit.
  const tooShort = next.length > 0 && next.length < MIN;
  const mismatch = confirm.length > 0 && next !== confirm;
  const ready = current.length > 0 && next.length >= MIN && next === confirm;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      // Password change rotates the token; the handler refreshes the cookie.
      setSession(await changePassword(current, next));
      setCurrent('');
      setNext('');
      setConfirm('');
      toast({
        title: 'Password changed',
        message: 'Use the new one next time you sign in.',
        tone: 'success',
      });
    } catch (err) {
      const message = errMsg(err, 'Could not change password');
      setError(message);
      toast({ title: 'Could not change password', message, tone: 'error' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card p-5 space-y-4">
      <PasswordField
        label="Current password"
        value={current}
        onChange={setCurrent}
        autoComplete="current-password"
      />
      <div className="grid sm:grid-cols-2 gap-4">
        <PasswordField
          label="New password"
          value={next}
          onChange={setNext}
          problem={tooShort ? `${MIN} characters minimum.` : null}
        />
        <PasswordField
          label="Confirm new password"
          value={confirm}
          onChange={setConfirm}
          problem={mismatch ? 'These don’t match yet.' : null}
        />
      </div>
      {error && <p className="note note-danger">{error}</p>}
      <div className="flex justify-end pt-1">
        <button disabled={busy || !ready} className="btn btn-primary">
          {busy ? 'Saving…' : 'Update password'}
        </button>
      </div>
    </form>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  problem = null,
  autoComplete = 'new-password',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  problem?: string | null;
  autoComplete?: string;
}) {
  const isNew = autoComplete === 'new-password';
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      <input
        className="input"
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        minLength={isNew ? MIN : undefined}
        maxLength={isNew ? MAX : undefined}
        autoComplete={autoComplete}
        aria-invalid={Boolean(problem)}
      />
      {problem && <span className="field-hint !text-warning-content">{problem}</span>}
    </label>
  );
}
