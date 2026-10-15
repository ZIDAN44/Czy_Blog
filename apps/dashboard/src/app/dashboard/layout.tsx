'use client';
import { useCallback, useEffect, useState } from 'react';
import Nav from '@/components/Nav';
import { api, currentUser, setSession, type SessionUser } from '@/lib/api';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  // Middleware already verified the cookie; this only ensures the cached profile
  // exists for the nav. A dead session is handled inside api() (sign out + /login);
  // anything else here means the API is unreachable, which is worth saying.
  const hydrate = useCallback(async () => {
    if (currentUser()) {
      setReady(true);
      return;
    }
    setFailed(false);
    try {
      setSession(await api<SessionUser>('/api/v1/auth/me'));
      setReady(true);
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (failed)
    return (
      <main className="min-h-screen grid place-items-center p-6 text-center">
        <div>
          <p className="t-heading">Can&apos;t reach the server</p>
          <p className="t-secondary mt-1">Check that the API is running, then try again.</p>
          <button onClick={hydrate} className="btn btn-secondary mt-5">
            Try again
          </button>
        </div>
      </main>
    );
  if (!ready) return null;
  return (
    <div className="min-h-screen">
      <Nav />
      <div className="lg:pl-64">
        {/* Bottom padding leaves room for toasts to sit over content, not on it. */}
        <main className="max-w-6xl mx-auto px-4 sm:px-8 pt-8 lg:pt-12 pb-24 w-full animate-fadeIn">
          {children}
        </main>
      </div>
    </div>
  );
}
