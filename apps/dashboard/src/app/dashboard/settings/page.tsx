'use client';
import { useState } from 'react';
import { api } from '@/lib/api';
import { useToast } from '@/components/Toast';
import { errMsg } from '@/lib/utils';

export default function SettingsPage() {
  const toast = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Validated as you type, not saved up to be sprung on you at submit.
  const tooShort = newPassword.length > 0 && newPassword.length < 8;
  const mismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;
  const ready =
    currentPassword.length > 0 && newPassword.length >= 8 && newPassword === confirmPassword;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api('/api/v1/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast({
        title: 'Password changed',
        message: 'Use the new one next time you sign in.',
        tone: 'success',
      });
    } catch (e) {
      const message = errMsg(e, 'Could not change password');
      setError(message);
      toast({ title: 'Could not change password', message, tone: 'error' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="t-display">Settings</h1>
        <p className="t-secondary mt-1 max-w-xl">Manage your account.</p>
      </header>

      <section className="card p-5">
        <h2 className="t-label">Change password</h2>
        <form onSubmit={submit} className="mt-4 max-w-sm space-y-4">
          <label className="block">
            <span className="t-caption font-medium text-content-secondary">Current password</span>
            <input
              className="input mt-1"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </label>
          <label className="block">
            <span className="t-caption font-medium text-content-secondary">New password</span>
            <input
              className="input mt-1"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              aria-invalid={tooShort}
              placeholder="At least 8 characters"
            />
            {tooShort && (
              <span className="t-caption text-warning-content mt-1 block">
                8 characters minimum.
              </span>
            )}
          </label>
          <label className="block">
            <span className="t-caption font-medium text-content-secondary">
              Confirm new password
            </span>
            <input
              className="input mt-1"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              aria-invalid={mismatch}
            />
            {mismatch && (
              <span className="t-caption text-warning-content mt-1 block">
                These two do not match yet.
              </span>
            )}
          </label>
          {error && <p className="note note-danger t-body">{error}</p>}
          <button disabled={busy || !ready} className="btn btn-primary">
            {busy ? 'Saving…' : 'Update password'}
          </button>
        </form>
      </section>
    </div>
  );
}
