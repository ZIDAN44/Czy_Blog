'use client';
import { useEffect, useState } from 'react';
import { changePassword, currentUser, setSession, type SessionUser } from '@/lib/api';
import PageHeader from '@/components/PageHeader';
import ThemeToggle from '@czyblog/ui/ThemeToggle';
import { useToast } from '@/components/Toast';
import { errMsg, initials } from '@/lib/utils';

const ROLE_NAME: Record<string, string> = {
  SUPER_ADMIN: 'Super admin',
  EDITOR: 'Editor',
  AUTHOR: 'Author',
  CONTRIBUTOR: 'Contributor',
};

export default function SettingsPage() {
  const toast = useToast();
  const [me, setMe] = useState<SessionUser | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => setMe(currentUser()), []);

  // Validated as you type, not sprung on you at submit.
  const tooShort = newPassword.length > 0 && newPassword.length < 8;
  const mismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;
  const ready =
    currentPassword.length > 0 && newPassword.length >= 8 && newPassword === confirmPassword;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      // Password change rotates the token; the handler refreshes the cookie.
      setSession(await changePassword(currentPassword, newPassword));
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
    <div className="max-w-4xl">
      <PageHeader title="Settings" description="Your account and how the dashboard looks." />

      <div className="divide-y divide-line">
        <Row title="Profile" hint="How you appear on posts you publish.">
          <div className="card p-4 flex items-center gap-4">
            <span className="grid place-items-center w-12 h-12 rounded-full bg-accent-soft text-accent-content font-semibold">
              {initials(me?.name)}
            </span>
            <div className="min-w-0 leading-tight">
              <div className="t-subheading truncate">{me?.name}</div>
              <div className="t-caption truncate mt-1">{me?.email}</div>
            </div>
            <span className="ml-auto tag">{me ? ROLE_NAME[me.role] : ''}</span>
          </div>
        </Row>

        <Row title="Appearance" hint="Follows your system by default.">
          <ThemeToggle />
        </Row>

        <Row title="Password" hint="At least 8 characters. Changing it signs out other sessions.">
          <form onSubmit={submit} className="card p-5 space-y-4">
            <label className="block">
              <span className="field-label">Current password</span>
              <input
                className="input"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </label>
            <div className="grid sm:grid-cols-2 gap-4">
              <label className="block">
                <span className="field-label">New password</span>
                <input
                  className="input"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  maxLength={72}
                  autoComplete="new-password"
                  aria-invalid={tooShort}
                />
                {tooShort && (
                  <span className="field-hint !text-warning-content">8 characters minimum.</span>
                )}
              </label>
              <label className="block">
                <span className="field-label">Confirm new password</span>
                <input
                  className="input"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  maxLength={72}
                  autoComplete="new-password"
                  aria-invalid={mismatch}
                />
                {mismatch && (
                  <span className="field-hint !text-warning-content">
                    These don&apos;t match yet.
                  </span>
                )}
              </label>
            </div>
            {error && <p className="note note-danger">{error}</p>}
            <div className="flex justify-end pt-1">
              <button disabled={busy || !ready} className="btn btn-primary">
                {busy ? 'Saving…' : 'Update password'}
              </button>
            </div>
          </form>
        </Row>
      </div>
    </div>
  );
}

function Row({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-4 md:grid-cols-[14rem_1fr] py-8 first:pt-0">
      <div>
        <h2 className="t-heading">{title}</h2>
        <p className="t-caption mt-1">{hint}</p>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}
