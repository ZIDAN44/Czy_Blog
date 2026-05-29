'use client';
import { useState } from 'react';
import { api } from '@/lib/api';
import { useNotify } from '@/components/ConfirmDialog';
import { errMsg } from '@/lib/utils';

export default function SettingsPage() {
  const notify = useNotify();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    setBusy(true);
    try {
      await api('/api/v1/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      await notify({
        title: 'Password changed',
        message: 'Your password has been updated.',
        tone: 'success',
      });
    } catch (e) {
      setError(errMsg(e, 'Could not change password'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-slate-500 mt-1 max-w-xl">Manage your account.</p>
      </header>

      <section className="card p-5">
        <h2 className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
          Change password
        </h2>
        <form onSubmit={submit} className="mt-4 max-w-sm space-y-4">
          <label className="block">
            <span className="text-xs font-medium text-slate-600">Current password</span>
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
            <span className="text-xs font-medium text-slate-600">New password</span>
            <input
              className="input mt-1"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="At least 8 characters"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-slate-600">Confirm new password</span>
            <input
              className="input mt-1"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </label>
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <button disabled={busy} className="btn btn-primary">
            {busy ? 'Saving…' : 'Update password'}
          </button>
        </form>
      </section>
    </div>
  );
}
