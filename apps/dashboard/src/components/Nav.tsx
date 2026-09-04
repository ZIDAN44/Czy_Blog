'use client';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Logo from '@/components/Logo';
import { Popover, Sheet } from '@/components/Overlay';
import ThemeToggle from '@/components/ThemeToggle';
import { clearSession, currentUser, type SessionUser } from '@/lib/api';
import { useIsCompact, useMovingIndicator, useScrolled } from '@/lib/useMotion';
import { initials } from '@/lib/utils';

interface NavLink {
  href: string;
  label: string;
}

export default function Nav() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const scrolled = useScrolled();
  const compact = useIsCompact();

  useEffect(() => {
    setUser(currentUser());
  }, []);

  function signOut() {
    clearSession();
    router.replace('/login');
  }

  const canManageUsers = user && (user.role === 'SUPER_ADMIN' || user.role === 'EDITOR');

  // Specific labels, not vague umbrellas — a destination should be predictable.
  const links: NavLink[] = [
    { href: '/dashboard', label: 'Overview' },
    { href: '/dashboard/posts', label: 'Posts' },
    { href: '/dashboard/posts/new', label: 'Write' },
    ...(canManageUsers ? [{ href: '/dashboard/users', label: 'Users' }] : []),
    { href: '/dashboard/api-keys', label: 'API keys' },
  ];

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === href : pathname.startsWith(href);
  const activeHref = links.find((l) => isActive(l.href))?.href ?? null;

  const menu = (
    <AccountMenu user={user} onNavigate={() => setMenuOpen(false)} onSignOut={signOut} />
  );

  return (
    <header
      className="chrome sticky top-0 z-30"
      data-scrolled={scrolled}
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center gap-6">
        <Link href="/dashboard" className="flex items-center gap-2 group pressable">
          <Logo className="w-7 h-7 text-content" />
          <span className="font-semibold tracking-tight">Czy Blog</span>
        </Link>

        <NavRail links={links} activeHref={activeHref} className="hidden md:flex" />

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
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-full hover:bg-fill-hover"
            >
              <span className="grid place-items-center w-7 h-7 rounded-full bg-inverse text-on-inverse text-xs font-semibold">
                {initials(user?.name)}
              </span>
              <span className="hidden sm:block t-caption max-w-[10ch] truncate vibrant-secondary">
                {user?.name}
              </span>
            </button>
            {/* Grows out of the avatar it belongs to. */}
            {!compact && (
              <Popover
                open={menuOpen}
                onClose={() => setMenuOpen(false)}
                origin="top right"
                className="right-0 mt-2 w-60 p-1.5"
              >
                {menu}
              </Popover>
            )}
          </div>
        </div>
      </div>

      {/* On a phone the same menu arrives as a sheet you can throw away. */}
      {compact && (
        <Sheet open={menuOpen} onClose={() => setMenuOpen(false)}>
          {menu}
        </Sheet>
      )}

      <NavRail
        links={links}
        activeHref={activeHref}
        className="md:hidden overflow-x-auto px-4 pb-2"
      />
    </header>
  );
}

function AccountMenu({
  user,
  onNavigate,
  onSignOut,
}: {
  user: SessionUser | null;
  onNavigate: () => void;
  onSignOut: () => void;
}) {
  return (
    <div role="menu">
      <div className="px-3 py-2 border-b border-line mb-1">
        <div className="t-subheading truncate">{user?.name}</div>
        <div className="t-caption font-mono">{user?.role?.replace('_', ' ').toLowerCase()}</div>
      </div>
      <div className="px-3 pb-2">
        <div className="t-label mb-1.5">Appearance</div>
        <ThemeToggle />
      </div>
      <Link
        href="/dashboard/settings"
        role="menuitem"
        onClick={onNavigate}
        className="block t-body px-3 py-2 rounded-lg hover:bg-fill-hover text-content"
      >
        Account settings
      </Link>
      <Link
        href="/read"
        role="menuitem"
        target="_blank"
        onClick={onNavigate}
        className="block t-body px-3 py-2 rounded-lg hover:bg-fill-hover text-content sm:hidden"
      >
        View site ↗
      </Link>
      <button
        role="menuitem"
        onClick={onSignOut}
        className="w-full text-left t-body px-3 py-2 rounded-lg hover:bg-fill-hover text-content"
      >
        Sign out
      </button>
    </div>
  );
}

// Active marker travels between destinations (via useMovingIndicator, shared with SegmentedControl).
function NavRail({
  links,
  activeHref,
  className = '',
}: {
  links: NavLink[];
  activeHref: string | null;
  className?: string;
}) {
  const {
    trackRef,
    indicatorRef: markerRef,
    setItem,
  } = useMovingIndicator<string, HTMLElement, HTMLSpanElement>(activeHref);

  return (
    <nav ref={trackRef} className={`relative items-center gap-1 flex text-sm ${className}`}>
      <span
        ref={markerRef}
        aria-hidden
        className="absolute inset-y-0 left-0 rounded-lg bg-inverse will-move"
        style={{ opacity: 0 }}
      />
      {links.map((l) => {
        const active = l.href === activeHref;
        return (
          <Link
            key={l.href}
            ref={setItem(l.href)}
            href={l.href}
            aria-current={active ? 'page' : undefined}
            className={`relative z-10 px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
              active ? 'text-on-inverse' : 'text-content-secondary hover:text-content'
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
