'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowUpRight, ChevronsUpDown, PenLine } from 'lucide-react';
import Logo from '@czyblog/ui/Logo';
import { Popover } from '@/components/overlay';
import type { SessionUser } from '@/lib/api';
import { ROLE_NAME } from '@/lib/roles';
import { siteUrl } from '@/lib/site';
import AccountMenu from './AccountMenu';
import NavList from './NavList';
import UserAvatar from './UserAvatar';
import type { NavLink } from './navigation';

// Desktop (lg+) fixed sidebar: brand, write button, destinations, account.
export default function Sidebar({ user, links }: { user: SessionUser | null; links: NavLink[] }) {
  const pathname = usePathname();
  return (
    <aside className="hidden lg:flex fixed inset-y-0 left-0 z-30 w-64 flex-col border-r border-line bg-surface-sunken/60">
      <Link href="/dashboard" className="flex items-center gap-2.5 h-16 px-5 shrink-0">
        <Logo size={28} />
        <span className="font-serif text-[1.1875rem] font-medium tracking-[-0.015em]">
          Czy Blog
        </span>
      </Link>
      <div className="px-3 pt-2 space-y-5 flex-1 overflow-y-auto">
        <Link
          href="/dashboard/posts/new"
          className={`btn btn-primary w-full justify-start ${pathname === '/dashboard/posts/new' ? 'opacity-90' : ''}`}
        >
          <PenLine /> New post
        </Link>
        <div>
          <div className="t-label px-2.5 mb-1.5">Workspace</div>
          <NavList links={links} />
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
        <AccountButton user={user} />
      </div>
    </aside>
  );
}

function AccountButton({ user }: { user: SessionUser | null }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]); // navigating closes the menu

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-fill-hover text-left active:!scale-100"
      >
        <UserAvatar name={user?.name} />
        <span className="flex-1 min-w-0 leading-tight">
          <span className="block text-sm font-medium truncate">{user?.name}</span>
          <span className="block t-caption truncate">{user ? ROLE_NAME[user.role] : ''}</span>
        </span>
        <ChevronsUpDown className="w-4 h-4 text-content-tertiary" />
      </button>
      <Popover
        open={open}
        onClose={() => setOpen(false)}
        origin="bottom left"
        className="bottom-full left-0 mb-2 w-64"
      >
        <AccountMenu user={user} />
      </Popover>
    </div>
  );
}
