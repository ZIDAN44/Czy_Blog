'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import AuthField from '@/components/auth/AuthField';
import AuthShell from '@/components/auth/AuthShell';
import SetupPanel from '@/components/auth/SetupPanel';
import { bootstrapAccount, needsBootstrap, setSession } from '@/lib/api';
import { errMsg } from '@/lib/utils';

// First-run only: open while the install has no users, otherwise sends you to sign in.
export default function SignupPage() {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        if (await needsBootstrap()) setAllowed(true);
        else router.replace('/login');
      } catch (e) {
        setError(errMsg(e, 'Could not reach API'));
      }
    })();
  }, [router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      setSession(await bootstrapAccount({ email, name, password }));
      // Full load so no pre-auth redirect cached by the client router is reused.
      window.location.replace('/dashboard');
    } catch (e) {
      setError(errMsg(e, 'Sign-up failed'));
      setBusy(false);
    }
  }

  if (!allowed)
    return error ? (
      <main className="min-h-screen grid place-items-center p-6">
        <p className="note note-danger">{error}</p>
      </main>
    ) : null;

  return (
    <AuthShell panel={<SetupPanel />}>
      <form onSubmit={submit} className="w-full max-w-[22rem] animate-slideUp">
        <h1 className="t-title">Create your admin account</h1>
        <p className="t-secondary mt-1.5">
          You&apos;re the first user, so this account gets full access.
        </p>

        <div className="mt-8 space-y-4">
          <AuthField
            label="Your name"
            value={name}
            onChange={setName}
            autoFocus
            placeholder="Ada Lovelace"
          />
          <AuthField
            label="Email"
            value={email}
            onChange={setEmail}
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
          />
          <AuthField
            label="Password"
            value={password}
            onChange={setPassword}
            type="password"
            minLength={8}
            maxLength={72}
            autoComplete="new-password"
            placeholder="At least 8 characters"
          />
        </div>
        {error && (
          <p role="alert" className="note note-danger mt-4 animate-slideUp">
            {error}
          </p>
        )}
        <button disabled={busy} className="btn btn-primary btn-lg w-full mt-6">
          {busy && <Loader2 className="animate-spin" />}
          {busy ? 'Creating account…' : 'Create admin account'}
        </button>
      </form>
    </AuthShell>
  );
}
