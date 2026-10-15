'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Loader2 } from 'lucide-react';
import AuthShell from '@/components/AuthShell';
import { bootstrapAccount, needsBootstrap, setSession } from '@/lib/api';
import { errMsg } from '@/lib/utils';

const STEPS = [
  'This account becomes the super admin.',
  'Invite editors, authors, and contributors.',
  'Write, schedule, and publish from one place.',
];

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
    <AuthShell
      panel={
        <div className="max-w-md">
          <span className="inline-flex items-center h-6 px-2.5 rounded-full text-xs font-medium bg-white/10 ring-1 ring-white/15">
            First-run setup
          </span>
          <h2 className="font-serif text-[2.75rem] leading-[1.08] tracking-[-0.025em] mt-5">
            Set up your blog.
          </h2>
          <ul className="mt-8 space-y-3">
            {STEPS.map((s) => (
              <li key={s} className="flex items-start gap-3 text-[0.9375rem] text-brand-muted">
                <span className="grid place-items-center w-5 h-5 mt-0.5 rounded-full bg-white/10 text-on-brand shrink-0">
                  <Check className="w-3 h-3" strokeWidth={3} />
                </span>
                {s}
              </li>
            ))}
          </ul>
        </div>
      }
    >
      <form onSubmit={submit} className="w-full max-w-[22rem] animate-slideUp">
        <h1 className="t-title">Create your admin account</h1>
        <p className="t-secondary mt-1.5">
          You&apos;re the first user, so this account gets full access.
        </p>

        <div className="mt-8 space-y-4">
          <label className="block">
            <span className="field-label">Your name</span>
            <input
              className="input h-10"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              placeholder="Ada Lovelace"
            />
          </label>
          <label className="block">
            <span className="field-label">Email</span>
            <input
              className="input h-10"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
            />
          </label>
          <label className="block">
            <span className="field-label">Password</span>
            <input
              className="input h-10"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
              minLength={8}
              maxLength={72}
              autoComplete="new-password"
              placeholder="At least 8 characters"
            />
          </label>
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
