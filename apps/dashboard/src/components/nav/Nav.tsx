'use client';
import { useEffect, useState } from 'react';
import { currentUser, type SessionUser } from '@/lib/api';
import MobileNav from './MobileNav';
import Sidebar from './Sidebar';
import { navLinks } from './navigation';

// Sidebar on desktop; a top bar with a sheet menu below lg. Both render and CSS
// picks one, so there's no first-paint flash while a media query resolves.
export default function Nav() {
  const [user, setUser] = useState<SessionUser | null>(null);
  useEffect(() => setUser(currentUser()), []);

  const links = navLinks(user?.role);
  return (
    <>
      <Sidebar user={user} links={links} />
      <MobileNav user={user} links={links} />
    </>
  );
}
