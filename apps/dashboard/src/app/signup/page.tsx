'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, setSession, type SessionUser } from '@/lib/api';

// First-run onboarding. Visible only when no users exist yet; otherwise
// bounces to /login. The first user becomes SUPER_ADMIN.
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
        const r = await api<{ needsBootstrap: boolean }>('/api/v1/auth/bootstrap-status', { skipAuth: true });
        if (!r.needsBootstrap) router.replace('/login');
        else setAllowed(true);
      } catch (e: any) {
        setError(e.message);
      }
    })();
  }, [router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const { token, user } = await api<{ token: string; user: SessionUser }>('/api/v1/auth/bootstrap', {
        method: 'POST', body: JSON.stringify({ email, name, password }), skipAuth: true,
      });
      setSession(token, user);
      router.replace('/dashboard');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (!allowed) return null;

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-sm bg-white rounded-2xl shadow p-8 space-y-4">
        <h1 className="text-2xl font-bold">Welcome to Czy Blog</h1>
        <p className="text-sm text-slate-500">
          You're the first user on this install — this account becomes the <strong>super admin</strong>.
          Further accounts are created by you from the dashboard.
        </p>
        <label className="block">
          <span className="text-sm font-medium">Your name</span>
          <input className="mt-1 w-full border rounded-lg px-3 py-2"
            value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Email</span>
          <input className="mt-1 w-full border rounded-lg px-3 py-2"
            value={email} onChange={(e) => setEmail(e.target.value)} type="email" required autoComplete="email" />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Password</span>
          <input className="mt-1 w-full border rounded-lg px-3 py-2"
            value={password} onChange={(e) => setPassword(e.target.value)} type="password" required
            minLength={8} autoComplete="new-password" />
          <span className="text-xs text-slate-400">Minimum 8 characters.</span>
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button disabled={busy} className="w-full bg-slate-900 text-white rounded-lg py-2 disabled:opacity-60">
          {busy ? 'Creating account…' : 'Create admin account'}
        </button>
      </form>
    </main>
  );
}
