'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  ArrowUpRight,
  ChevronsUpDown,
  FileText,
  KeyRound,
  LayoutGrid,
  LogOut,
  Menu,
  PenLine,
  Settings,
  Users,
  type LucideIcon,
} from 'lucide-react';
import Logo from '@czyblog/ui/Logo';
import { Popover, Sheet } from '@/components/Overlay';
import ThemeToggle from '@czyblog/ui/ThemeToggle';
import { clearSession, currentUser, logout, type SessionUser } from '@/lib/api';
import { siteUrl } from '@/lib/site';
import { useMediaQuery, useScrolled } from '@czyblog/ui/hooks';
import { initials } from '@/lib/utils';

interface NavLink {
  href: string;
  label: string;
  icon: LucideIcon;
}

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: 'Super admin',
  EDITOR: 'Editor',
  AUTHOR: 'Author',
  CONTRIBUTOR: 'Contributor',
};

// Sidebar on desktop; a top bar with a sheet menu below lg.
export default function Nav() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const scrolled = useScrolled();
  const desktop = useMediaQuery('(min-width: 1024px)');

  useEffect(() => {
    setUser(currentUser());
  }, []);

  // A route change closes whichever menu led there.
  useEffect(() => {
    setMobileOpen(false);
    setAccountOpen(false);
  }, [pathname]);

  async function signOut() {
    // Clear the server cookie first, then the cached profile.
    await logout();
    clearSession();
    // Full load drops the router cache, so no signed-in pages linger in memory.
    window.location.replace('/login');
  }

  const canManageUsers = user && (user.role === 'SUPER_ADMIN' || user.role === 'EDITOR');

  const links: NavLink[] = [
    { href: '/dashboard', label: 'Overview', icon: LayoutGrid },
    { href: '/dashboard/posts', label: 'Posts', icon: FileText },
    ...(canManageUsers ? [{ href: '/dashboard/users', label: 'Users', icon: Users }] : []),
    { href: '/dashboard/api-keys', label: 'API keys', icon: KeyRound },
    { href: '/dashboard/settings', label: 'Settings', icon: Settings },
  ];

  const isActive = (href: string) =>
    href === '/dashboard'
      ? pathname === href
      : href === '/dashboard/posts'
        ? pathname.startsWith(href) && pathname !== '/dashboard/posts/new'
        : pathname.startsWith(href);

  const navList = (
    <nav className="flex flex-col gap-0.5">
      {links.map((l) => {
        const active = isActive(l.href);
        const Icon = l.icon;
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? 'page' : undefined}
            className={`group flex items-center gap-2.5 h-9 px-2.5 rounded-lg text-sm ${
              active
                ? 'bg-fill-active text-content font-medium'
                : 'text-content-secondary hover:text-content hover:bg-fill-hover'
            }`}
          >
            <Icon
              className={`w-4 h-4 ${active ? 'text-content' : 'text-content-tertiary group-hover:text-content-secondary'}`}
              strokeWidth={active ? 2.2 : 1.9}
            />
            {l.label}
          </Link>
        );
      })}
    </nav>
  );

  const writeButton = (
    <Link
      href="/dashboard/posts/new"
      className={`btn btn-primary w-full justify-start ${pathname === '/dashboard/posts/new' ? 'opacity-90' : ''}`}
    >
      <PenLine /> New post
    </Link>
  );

  const account = (
    <div role="menu" className="p-1">
      <div className="px-2.5 pt-2 pb-3">
        <div className="t-subheading truncate">{user?.name}</div>
        <div className="t-caption truncate">{user?.email}</div>
      </div>
      <div className="px-2.5 pb-3 border-b border-line mb-1">
        <div className="t-label mb-2">Appearance</div>
        <ThemeToggle />
      </div>
      <a
        href={siteUrl()}
        role="menuitem"
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-2.5 h-9 px-2.5 rounded-lg text-sm text-content hover:bg-fill-hover"
      >
        <ArrowUpRight className="w-4 h-4 text-content-tertiary" /> View site
      </a>
      <button
        role="menuitem"
        onClick={signOut}
        className="w-full flex items-center gap-2.5 h-9 px-2.5 rounded-lg text-sm text-content hover:bg-fill-hover active:!scale-100"
      >
        <LogOut className="w-4 h-4 text-content-tertiary" /> Sign out
      </button>
    </div>
  );

  const avatar = (
    <span className="grid place-items-center w-8 h-8 shrink-0 rounded-full bg-accent-soft text-accent-content text-xs font-semibold">
      {initials(user?.name)}
    </span>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-30 w-64 flex-col border-r border-line bg-surface-sunken/60">
        <Link href="/dashboard" className="flex items-center gap-2.5 h-16 px-5 shrink-0">
          <Logo size={28} />
          <span className="leading-tight">
            <span className="block font-serif text-[1.1875rem] font-medium tracking-[-0.015em]">
              Czy Blog
            </span>
          </span>
        </Link>
        <div className="px-3 pt-2 space-y-5 flex-1 overflow-y-auto">
          {writeButton}
          <div>
            <div className="t-label px-2.5 mb-1.5">Workspace</div>
            {navList}
          </div>
        </div>
        <div className="p-3 border-t border-line">
          <a
            href={siteUrl()}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between h-9 px-2.5 mb-1 rounded-lg text-sm text-content-secondary hover:text-content hover:bg-fill-hover"
          >
            View site <ArrowUpRight className="w-4 h-4" />
          </a>
          <div className="relative">
            <button
              onClick={() => setAccountOpen((o) => !o)}
              aria-haspopup="menu"
              aria-expanded={accountOpen}
              className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-fill-hover text-left active:!scale-100"
            >
              {avatar}
              <span className="flex-1 min-w-0 leading-tight">
                <span className="block text-sm font-medium truncate">{user?.name}</span>
                <span className="block t-caption truncate">
                  {user ? ROLE_LABEL[user.role] : ''}
                </span>
              </span>
              <ChevronsUpDown className="w-4 h-4 text-content-tertiary" />
            </button>
            {desktop && (
              <Popover
                open={accountOpen}
                onClose={() => setAccountOpen(false)}
                origin="bottom left"
                className="bottom-full left-0 mb-2 w-64"
              >
                {account}
              </Popover>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header
        className="lg:hidden chrome sticky top-0 z-30"
        data-scrolled={scrolled}
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="h-14 px-4 flex items-center gap-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="btn btn-ghost btn-icon -ml-2"
            aria-label="Open menu"
          >
            <Menu className="!w-5 !h-5" />
          </button>
          <Link href="/dashboard" className="flex items-center gap-2">
            <Logo size={26} />
            <span className="font-serif text-lg font-medium tracking-[-0.015em]">Czy Blog</span>
          </Link>
          <Link href="/dashboard/posts/new" className="btn btn-primary btn-sm ml-auto">
            <PenLine /> Write
          </Link>
        </div>
      </header>

      {!desktop && (
        <Sheet open={mobileOpen} onClose={() => setMobileOpen(false)}>
          <div className="space-y-4 pb-2">
            <div className="flex items-center gap-3">
              {avatar}
              <div className="min-w-0 leading-tight">
                <div className="t-subheading truncate">{user?.name}</div>
                <div className="t-caption">{user ? ROLE_LABEL[user.role] : ''}</div>
              </div>
            </div>
            {navList}
            <div className="border-t border-line pt-3 space-y-3">
              <ThemeToggle />
              <div className="flex gap-2">
                <a
                  href={siteUrl()}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary flex-1"
                >
                  <ArrowUpRight /> View site
                </a>
                <button onClick={signOut} className="btn btn-secondary flex-1">
                  <LogOut /> Sign out
                </button>
              </div>
            </div>
          </div>
        </Sheet>
      )}
    </>
  );
}
