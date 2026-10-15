'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowUpRight, LogOut, Menu, PenLine } from 'lucide-react';
import Logo from '@czyblog/ui/Logo';
import ThemeToggle from '@czyblog/ui/ThemeToggle';
import { useScrolled } from '@czyblog/ui/hooks';
import { Sheet } from '@/components/overlay';
import type { SessionUser } from '@/lib/api';
import { ROLE_NAME } from '@/lib/roles';
import { siteUrl } from '@/lib/site';
import NavList from './NavList';
import UserAvatar from './UserAvatar';
import { signOut, type NavLink } from './navigation';

// Below lg: a sticky top bar, with the full menu in a bottom sheet.
export default function MobileNav({ user, links }: { user: SessionUser | null; links: NavLink[] }) {
  const [open, setOpen] = useState(false);
  const scrolled = useScrolled();
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]); // navigating closes the sheet

  return (
    <>
      <header
        className="lg:hidden chrome sticky top-0 z-30"
        data-scrolled={scrolled}
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="h-14 px-4 flex items-center gap-3">
          <button
            onClick={() => setOpen(true)}
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

      <Sheet open={open} onClose={() => setOpen(false)}>
        <div className="space-y-4 pb-2">
          <div className="flex items-center gap-3">
            <UserAvatar name={user?.name} />
            <div className="min-w-0 leading-tight">
              <div className="t-subheading truncate">{user?.name}</div>
              <div className="t-caption">{user ? ROLE_NAME[user.role] : ''}</div>
            </div>
          </div>
          <NavList links={links} />
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
    </>
  );
}
