'use client';
import Link from 'next/link';
import { ArrowUpRight, KeyRound, PenLine, Users, type LucideIcon } from 'lucide-react';
import { siteUrl } from '@/lib/site';

export default function Shortcuts({ showUsers }: { showUsers: boolean }) {
  return (
    <aside className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 content-start">
      <h2 className="t-label px-1 sm:col-span-2 xl:col-span-1">Shortcuts</h2>
      <Shortcut
        href="/dashboard/posts/new"
        icon={PenLine}
        title="Write a post"
        hint="Start a new draft"
      />
      {showUsers && (
        <Shortcut
          href="/dashboard/users"
          icon={Users}
          title="Manage people"
          hint="Roles and accounts"
        />
      )}
      <Shortcut
        href="/dashboard/api-keys"
        icon={KeyRound}
        title="API keys"
        hint="Read posts from other apps"
      />
      <Shortcut
        href={siteUrl()}
        external
        icon={ArrowUpRight}
        title="View the blog"
        hint="See it as readers do"
      />
    </aside>
  );
}

function Shortcut({
  href,
  icon: Icon,
  title,
  hint,
  external,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  hint: string;
  external?: boolean;
}) {
  const body = (
    <>
      <span className="grid place-items-center w-9 h-9 rounded-lg bg-surface-sunken ring-1 ring-line text-content-secondary group-hover:text-content">
        <Icon className="w-4 h-4" />
      </span>
      <span className="min-w-0 leading-tight">
        <span className="block text-sm font-medium">{title}</span>
        <span className="block t-caption mt-0.5">{hint}</span>
      </span>
    </>
  );
  const cls = 'group card flex items-center gap-3 p-3 hover:border-line-strong';
  return external ? (
    <a href={href} target="_blank" rel="noreferrer" className={cls}>
      {body}
    </a>
  ) : (
    <Link href={href} className={cls}>
      {body}
    </Link>
  );
}
