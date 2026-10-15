'use client';
import { useEffect, useState } from 'react';
import ThemeToggle from '@czyblog/ui/ThemeToggle';
import PageHeader from '@/components/PageHeader';
import PasswordForm from '@/components/settings/PasswordForm';
import { currentUser, type SessionUser } from '@/lib/api';
import { ROLE_NAME } from '@/lib/roles';
import { initials } from '@/lib/utils';

export default function SettingsPage() {
  const [me, setMe] = useState<SessionUser | null>(null);
  useEffect(() => setMe(currentUser()), []);

  return (
    <div className="max-w-4xl">
      <PageHeader title="Settings" description="Your account and how the dashboard looks." />

      <div className="divide-y divide-line">
        <Row title="Profile" hint="How you appear on posts you publish.">
          <div className="card p-4 flex items-center gap-4">
            <span className="grid place-items-center w-12 h-12 rounded-full bg-accent-soft text-accent-content font-semibold">
              {initials(me?.name)}
            </span>
            <div className="min-w-0 leading-tight">
              <div className="t-subheading truncate">{me?.name}</div>
              <div className="t-caption truncate mt-1">{me?.email}</div>
            </div>
            <span className="ml-auto tag">{me ? ROLE_NAME[me.role] : ''}</span>
          </div>
        </Row>

        <Row title="Appearance" hint="Follows your system by default.">
          <ThemeToggle />
        </Row>

        <Row title="Password" hint="At least 8 characters. Changing it signs out other sessions.">
          <PasswordForm />
        </Row>
      </div>
    </div>
  );
}

function Row({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-4 md:grid-cols-[14rem_1fr] py-8 first:pt-0">
      <div>
        <h2 className="t-heading">{title}</h2>
        <p className="t-caption mt-1">{hint}</p>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}
