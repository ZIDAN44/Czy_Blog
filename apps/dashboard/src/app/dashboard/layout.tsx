'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Nav from '@/components/Nav';
import { api, currentUser, setSession, type SessionUser } from '@/lib/api';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  // Middleware already verified the cookie; this only ensures the cached profile
  // exists for the nav, hydrating it from the API rather than bouncing the user.
  useEffect(() => {
    if (currentUser()) {
      setReady(true);
      return;
    }
    (async () => {
      try {
        setSession(await api<SessionUser>('/api/v1/auth/me'));
        setReady(true);
      } catch {
        router.replace('/login');
      }
    })();
  }, [router]);
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
