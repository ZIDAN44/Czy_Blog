'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthShell from '@/components/AuthShell';
import Logo from '@/components/Logo';
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
      router.replace('/dashboard');
    } catch (e) {
      setError(errMsg(e, 'Sign-in failed'));
    } finally {
      setBusy(false);
    }
  }

  if (checking) return null;

  return (
    <AuthShell
      gradient={
        'radial-gradient(600px 400px at 20% 20%, rgba(99,102,241,0.45), transparent 60%),' +
        'radial-gradient(500px 400px at 80% 80%, rgba(14,165,233,0.35), transparent 60%)'
      }
      panel={
        <div className="relative space-y-4 max-w-sm">
          <h2 className="t-title leading-snug">Welcome back</h2>
          <p className="text-brand-muted t-body">
            Sign in to pick up your drafts, publish new posts, and manage your blog.
          </p>
        </div>
      }
    >
      <form onSubmit={submit} className="w-full max-w-sm space-y-5 animate-slideUp">
        <div className="lg:hidden flex items-center gap-2 mb-8">
          <Logo className="w-8 h-8 text-content" />
          <span className="font-semibold tracking-tight">Czy Blog</span>
        </div>
        <div>
          <h1 className="t-title">Sign in</h1>
          <p className="t-secondary mt-1">Enter your email and password to continue.</p>
        </div>
        <label className="block">
          <span className="t-caption font-medium text-content-secondary">Email</span>
          <input
            className="input mt-1"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
          />
        </label>
        <label className="block">
          <span className="t-caption font-medium text-content-secondary">Password</span>
          <input
            className="input mt-1"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
            autoComplete="current-password"
            placeholder="••••••••"
          />
        </label>
        {error && (
          <p role="alert" className="note note-danger t-body animate-slideUp">
            {error}
          </p>
        )}
        <button disabled={busy} className="btn btn-primary w-full py-2.5">
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </AuthShell>
  );
}
