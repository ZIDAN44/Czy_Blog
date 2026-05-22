'use client';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { clearSession, currentUser, type SessionUser } from '@/lib/api';

export default function Nav() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => { setUser(currentUser()); }, []);

  function signOut() { clearSession(); router.replace('/login'); }

  const canManageUsers = user && (user.role === 'SUPER_ADMIN' || user.role === 'EDITOR');

  const links: { href: string; label: string }[] = [
    { href: '/dashboard', label: 'Overview' },
    { href: '/dashboard/posts', label: 'Posts' },
    { href: '/dashboard/posts/new', label: 'New post' },
    ...(canManageUsers ? [{ href: '/dashboard/users', label: 'Users' }] : []),
    { href: '/dashboard/api-keys', label: 'API keys' },
    { href: '/read', label: 'View site →' },
  ];

  return (
    <header className="border-b bg-white">
      <div className="max-w-6xl mx-auto px-6 py-3 flex items-center gap-6">
        <Link href="/dashboard" className="font-bold text-lg">Czy Blog</Link>
        <nav className="flex gap-4 text-sm">
          {links.map((l) => (
            <Link key={l.href} href={l.href}
              className={pathname === l.href ? 'text-slate-900 font-medium' : 'text-slate-500 hover:text-slate-900'}>
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3 text-sm">
          {user && <span className="text-slate-500">{user.name} · <span className="font-mono text-xs">{user.role}</span></span>}
          <button onClick={signOut} className="text-slate-700 hover:underline">Sign out</button>
        </div>
      </div>
    </header>
  );
}
