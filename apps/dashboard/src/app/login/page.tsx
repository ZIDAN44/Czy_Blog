'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, setSession, type SessionUser } from '@/lib/api';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  // First-run guard: if there are zero users, redirect to /signup.
  useEffect(() => {
    (async () => {
      try {
        const r = await api<{ needsBootstrap: boolean }>('/api/v1/auth/bootstrap-status', { skipAuth: true });
        if (r.needsBootstrap) router.replace('/signup');
      } catch { /* API might be down — let the user try anyway */ }
      finally { setChecking(false); }
    })();
  }, [router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const { token, user } = await api<{ token: string; user: SessionUser }>('/api/v1/auth/login', {
        method: 'POST', body: JSON.stringify({ email, password }), skipAuth: true,
      });
      setSession(token, user);
      router.replace('/dashboard');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (checking) return null;

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-sm bg-white rounded-2xl shadow p-8 space-y-4">
        <h1 className="text-2xl font-bold">Czy Blog</h1>
        <p className="text-sm text-slate-500">Sign in to continue</p>
        <label className="block">
          <span className="text-sm font-medium">Email</span>
          <input className="mt-1 w-full border rounded-lg px-3 py-2"
            value={email} onChange={(e) => setEmail(e.target.value)} type="email" required autoComplete="email" />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Password</span>
          <input className="mt-1 w-full border rounded-lg px-3 py-2"
            value={password} onChange={(e) => setPassword(e.target.value)} type="password" required autoComplete="current-password" />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button disabled={busy} className="w-full bg-slate-900 text-white rounded-lg py-2 disabled:opacity-60">
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="text-xs text-slate-400 pt-2">
          No account? Accounts are created by your admin from the dashboard.
        </p>
      </form>
    </main>
  );
}
