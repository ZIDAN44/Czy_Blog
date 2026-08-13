'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Nav from '@/components/Nav';
import { currentUser } from '@/lib/api';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!currentUser()) router.replace('/login');
    else setReady(true);
  }, [router]);
  if (!ready) return null;
  return (
    <div className="min-h-screen flex flex-col">
      <Nav />
      {/* Bottom padding leaves room for toasts to sit over content, not on it. */}
      <main className="max-w-6xl mx-auto px-6 pt-10 pb-24 w-full animate-fadeIn">{children}</main>
    </div>
  );
}
