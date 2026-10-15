'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { isActive, type NavLink } from './navigation';

export default function NavList({ links }: { links: NavLink[] }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-0.5">
      {links.map((l) => {
        const active = isActive(pathname, l.href);
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
}
