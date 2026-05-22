'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api, currentUser } from '@/lib/api';

export default function Index() {
  const router = useRouter();
  useEffect(() => {
    (async () => {
      if (currentUser()) { router.replace('/dashboard'); return; }
      try {
        const r = await api<{ needsBootstrap: boolean }>('/api/v1/auth/bootstrap-status', { skipAuth: true });
        router.replace(r.needsBootstrap ? '/signup' : '/login');
      } catch {
        router.replace('/login');
      }
    })();
  }, [router]);
  return null;
}
