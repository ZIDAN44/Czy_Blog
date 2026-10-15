'use client';
import { ArrowUpRight, LogOut } from 'lucide-react';
import ThemeToggle from '@czyblog/ui/ThemeToggle';
import type { SessionUser } from '@/lib/api';
import { siteUrl } from '@/lib/site';
import { signOut } from './navigation';

const ITEM =
  'w-full flex items-center gap-2.5 h-9 px-2.5 rounded-lg text-sm text-content hover:bg-fill-hover';

// Contents of the desktop account popover.
export default function AccountMenu({ user }: { user: SessionUser | null }) {
  return (
    <div role="menu" className="p-1">
      <div className="px-2.5 pt-2 pb-3">
        <div className="t-subheading truncate">{user?.name}</div>
        <div className="t-caption truncate">{user?.email}</div>
      </div>
      <div className="px-2.5 pb-3 border-b border-line mb-1">
        <div className="t-label mb-2">Appearance</div>
        <ThemeToggle />
      </div>
      <a href={siteUrl()} role="menuitem" target="_blank" rel="noreferrer" className={ITEM}>
        <ArrowUpRight className="w-4 h-4 text-content-tertiary" /> View site
      </a>
      <button role="menuitem" onClick={signOut} className={`${ITEM} active:!scale-100`}>
        <LogOut className="w-4 h-4 text-content-tertiary" /> Sign out
      </button>
    </div>
  );
}
