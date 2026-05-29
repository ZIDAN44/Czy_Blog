'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Logo from '@/components/Logo';
import { api, currentUser, setSession, type SessionUser } from '@/lib/api';
import { errMsg } from '@/lib/utils';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (currentUser()) {
      router.replace('/dashboard');
      return;
    }
    (async () => {
      try {
        const r = await api<{ needsBootstrap: boolean }>('/api/v1/auth/bootstrap-status', {
          skipAuth: true,
        });
        if (r.needsBootstrap) router.replace('/signup');
      } catch {
        /* API might be down — let the user try anyway */
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
      const { token, user } = await api<{ token: string; user: SessionUser }>(
        '/api/v1/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({ email, password }),
          skipAuth: true,
        },
      );
      setSession(token, user);
      router.replace('/dashboard');
    } catch (e) {
      setError(errMsg(e, 'Sign-in failed'));
    } finally {
      setBusy(false);
    }
  }

  if (checking) return null;

  return (
    <main className="min-h-screen grid lg:grid-cols-2">
      {/* Brand panel */}
      <aside className="hidden lg:flex relative overflow-hidden bg-slate-950 text-white p-12 flex-col justify-between">
        <div
          aria-hidden
          className="absolute inset-0 opacity-60"
          style={{
            background:
              'radial-gradient(600px 400px at 20% 20%, rgba(99,102,241,0.45), transparent 60%),' +
              'radial-gradient(500px 400px at 80% 80%, rgba(14,165,233,0.35), transparent 60%)',
          }}
        />
        <div className="relative flex items-center gap-2.5">
          <Logo className="w-9 h-9 text-white" />
          <span className="font-semibold tracking-tight text-lg">Czy Blog</span>
        </div>
        <div className="relative space-y-4 max-w-sm">
          <h2 className="text-2xl font-semibold tracking-tight leading-snug">Welcome back!</h2>
          <p className="text-slate-300 text-sm leading-relaxed">
            Pick up where you left off | Finish that half-written draft | Start something new :D
          </p>
        </div>
        <div className="relative text-xs text-slate-400">© Czy Blog</div>
      </aside>

      {/* Form panel */}
      <section className="flex items-center justify-center p-6 sm:p-10">
        <form onSubmit={submit} className="w-full max-w-sm space-y-5 animate-slideUp">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <Logo className="w-8 h-8 text-slate-900" />
            <span className="font-semibold tracking-tight">Czy Blog</span>
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
            <p className="text-sm text-slate-500 mt-1">Use your email and password</p>
          </div>
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
              autoComplete="current-password"
              placeholder="••••••••"
            />
          </label>
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <button disabled={busy} className="btn btn-primary w-full py-2.5">
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </section>
    </main>
  );
}
