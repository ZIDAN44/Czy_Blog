import { FileText, KeyRound, LayoutGrid, Settings, Users, type LucideIcon } from 'lucide-react';
import { clearSession, logout, type Role } from '@/lib/api';
import { canManageUsers } from '@/lib/roles';

export interface NavLink {
  href: string;
  label: string;
  icon: LucideIcon;
}

/** Destinations, filtered by what the role may open. */
export function navLinks(role: Role | undefined): NavLink[] {
  return [
    { href: '/dashboard', label: 'Overview', icon: LayoutGrid },
    { href: '/dashboard/posts', label: 'Posts', icon: FileText },
    ...(canManageUsers(role) ? [{ href: '/dashboard/users', label: 'Users', icon: Users }] : []),
    { href: '/dashboard/api-keys', label: 'API keys', icon: KeyRound },
    { href: '/dashboard/settings', label: 'Settings', icon: Settings },
  ];
}

// Overview matches exactly; Posts covers editing but not "New post", which has its own button.
export function isActive(pathname: string, href: string): boolean {
  if (href === '/dashboard') return pathname === href;
  if (href === '/dashboard/posts')
    return pathname.startsWith(href) && pathname !== '/dashboard/posts/new';
  return pathname.startsWith(href);
}

export async function signOut() {
  // Clear the server cookie first, then the cached profile.
  await logout();
  clearSession();
  // Full load drops the router cache, so no signed-in pages linger in memory.
  window.location.replace('/login');
}
