'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { currentUser, needsBootstrap } from '@/lib/api';

export default function Index() {
  const router = useRouter();
  useEffect(() => {
    (async () => {
      if (currentUser()) {
        router.replace('/dashboard');
        return;
      }
      try {
        router.replace((await needsBootstrap()) ? '/signup' : '/login');
      } catch {
        router.replace('/login');
      }
    })();
  }, [router]);
  return null;
}
