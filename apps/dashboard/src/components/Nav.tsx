'use client';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Logo from '@/components/Logo';
import { clearSession, currentUser, type SessionUser } from '@/lib/api';

export default function Nav() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setUser(currentUser());
  }, []);

  function signOut() {
    clearSession();
    router.replace('/login');
  }

  const canManageUsers = user && (user.role === 'SUPER_ADMIN' || user.role === 'EDITOR');

  const links: { href: string; label: string }[] = [
    { href: '/dashboard', label: 'Overview' },
    { href: '/dashboard/posts', label: 'Posts' },
    { href: '/dashboard/posts/new', label: 'Write' },
    ...(canManageUsers ? [{ href: '/dashboard/users', label: 'Users' }] : []),
    { href: '/dashboard/api-keys', label: 'API keys' },
  ];

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((s) => s[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '?';

  return (
    <header className="sticky top-0 z-30 backdrop-blur-md bg-white/70 border-b border-slate-200/60">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center gap-6">
        <Link href="/dashboard" className="flex items-center gap-2 group">
          <Logo className="w-7 h-7 text-slate-900 group-hover:scale-105 transition-transform" />
          <span className="font-semibold tracking-tight">Czy Blog</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1 text-sm">
          {links.map((l) => {
            const active =
              l.href === '/dashboard' ? pathname === l.href : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  active
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/read"
            className="hidden sm:inline-flex btn btn-ghost text-xs"
            target="_blank"
          >
            View site ↗
          </Link>
          <div className="relative">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              onBlur={() => setTimeout(() => setMenuOpen(false), 150)}
              className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-full hover:bg-slate-100 transition-colors"
            >
              <span className="grid place-items-center w-7 h-7 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 text-white text-xs font-semibold">
                {initials}
              </span>
              <span className="hidden sm:block text-xs text-slate-600 max-w-[10ch] truncate">
                {user?.name}
              </span>
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-56 card p-1 animate-popIn">
                <div className="px-3 py-2 border-b border-slate-100">
                  <div className="text-sm font-medium truncate">{user?.name}</div>
                  <div className="text-xs text-slate-500 font-mono">{user?.role}</div>
                </div>
                <button
                  onClick={signOut}
                  className="w-full text-left text-sm px-3 py-2 rounded-md hover:bg-slate-50 text-slate-700"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* mobile nav */}
      <nav className="md:hidden flex items-center gap-1 px-4 pb-2 overflow-x-auto text-xs">
        {links.map((l) => {
          const active =
            l.href === '/dashboard' ? pathname === l.href : pathname.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`px-2.5 py-1 rounded-md whitespace-nowrap ${
                active ? 'bg-slate-900 text-white' : 'text-slate-600'
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
