'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, setSession, type SessionUser } from '@/lib/api';

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
        const r = await api<{ needsBootstrap: boolean }>('/api/v1/auth/bootstrap-status', {
          skipAuth: true,
        });
        if (!r.needsBootstrap) router.replace('/login');
        else setAllowed(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not reach API');
      }
    })();
  }, [router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { token, user } = await api<{ token: string; user: SessionUser }>(
        '/api/v1/auth/bootstrap',
        {
          method: 'POST',
          body: JSON.stringify({ email, name, password }),
          skipAuth: true,
        },
      );
      setSession(token, user);
      router.replace('/dashboard');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign-up failed');
    } finally {
      setBusy(false);
    }
  }

  if (!allowed) return null;

  return (
    <main className="min-h-screen grid lg:grid-cols-2">
      <aside className="hidden lg:flex relative overflow-hidden bg-slate-950 text-white p-12 flex-col justify-between">
        <div
          aria-hidden
          className="absolute inset-0 opacity-60"
          style={{
            background:
              'radial-gradient(600px 400px at 80% 20%, rgba(168,85,247,0.4), transparent 60%),' +
              'radial-gradient(500px 400px at 20% 80%, rgba(99,102,241,0.4), transparent 60%)',
          }}
        />
        <div className="relative flex items-center gap-2.5">
          <span className="grid place-items-center w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-400 to-violet-500 font-bold shadow-lg">
            C
          </span>
          <span className="font-semibold tracking-tight text-lg">Czy Blog</span>
        </div>
        <div className="relative space-y-4 max-w-md">
          <span className="inline-block text-[10px] uppercase tracking-widest bg-white/10 border border-white/15 rounded-full px-2.5 py-1 font-medium">
            First-run setup
          </span>
          <h2 className="text-3xl font-semibold tracking-tight leading-tight">
            Claim your install!
          </h2>
          <p className="text-slate-300 text-sm leading-relaxed">
            This first account becomes the super admin | From there, you can invite editors,
            authors, contributors and manage your blog!
          </p>
        </div>
        <div className="relative text-xs text-slate-400">© Czy Blog</div>
      </aside>

      <section className="flex items-center justify-center p-6 sm:p-10">
        <form onSubmit={submit} className="w-full max-w-sm space-y-5 animate-slideUp">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Create the super admin</h1>
            <p className="text-sm text-slate-500 mt-1">
              You're the first user — this account gets full access.
            </p>
          </div>
          <label className="block">
            <span className="text-xs font-medium text-slate-600">Your name</span>
            <input
              className="input mt-1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Ada Lovelace"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-slate-600">Email</span>
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
            <span className="text-xs font-medium text-slate-600">Password</span>
            <input
              className="input mt-1"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="At least 8 characters"
            />
            <span className="text-xs text-slate-400">Minimum 8 characters.</span>
          </label>
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <button disabled={busy} className="btn btn-primary w-full py-2.5">
            {busy ? 'Creating account…' : 'Create admin account'}
          </button>
        </form>
      </section>
    </main>
  );
}
