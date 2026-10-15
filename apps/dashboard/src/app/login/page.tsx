'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Loader2 } from 'lucide-react';
import AuthField from '@/components/auth/AuthField';
import AuthShell from '@/components/auth/AuthShell';
import { login, needsBootstrap, setSession } from '@/lib/api';
import { errMsg } from '@/lib/utils';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        if (await needsBootstrap()) router.replace('/signup');
      } catch {
        // API might be down — let the user try anyway.
      } finally {
        setChecking(false);
      }
    })();
  }, [router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      setSession(await login(email, password));
      // Full load, not router.replace: the client router may still hold the
      // middleware's "/dashboard → /login" redirect from when the session lapsed.
      window.location.replace('/dashboard');
    } catch (e) {
      setError(errMsg(e, 'Sign-in failed'));
      setBusy(false);
    }
  }

  if (checking) return null;

  return (
    <AuthShell
      panel={
        <div className="max-w-md">
          <p className="font-serif italic text-[2.5rem] leading-[1.12] tracking-[-0.02em]">
            “Write what should not be forgotten.”
          </p>
          <p className="mt-5 text-brand-muted text-[0.9375rem] leading-relaxed">
            Pick up your drafts, publish new posts, and keep your blog in order, all in one quiet
            place.
          </p>
        </div>
      }
    >
      <form onSubmit={submit} className="w-full max-w-[22rem] animate-slideUp">
        <h1 className="t-title">Welcome back</h1>
        <p className="t-secondary mt-1.5">Sign in to your dashboard.</p>

        <div className="mt-8 space-y-4">
          <AuthField
            label="Email"
            value={email}
            onChange={setEmail}
            type="email"
            autoFocus
            autoComplete="email"
            placeholder="you@example.com"
          />
          <AuthField
            label="Password"
            value={password}
            onChange={setPassword}
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
          />
        </div>

        {error && (
          <p role="alert" className="note note-danger mt-4 animate-slideUp">
            {error}
          </p>
        )}
        <button disabled={busy} className="btn btn-primary btn-lg w-full mt-6">
          {busy ? <Loader2 className="animate-spin" /> : null}
          {busy ? 'Signing in…' : 'Sign in'}
          {!busy && <ArrowRight />}
        </button>
      </form>
    </AuthShell>
  );
}
