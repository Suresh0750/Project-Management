'use client';

import Link from 'next/link';
import { UserRound } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { ChangePasswordForm } from '@/components/settings/change-password-form';
import { ThemeCard } from '@/components/settings/theme-card';
import { ROLE_BASE_PATH } from '@/lib/auth/navigation';
import type { Role } from '@/types/auth';

export function SettingsPage({ role }: { role: Role }) {
  const base = ROLE_BASE_PATH[role];

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Appearance and account security."
        breadcrumbs={[{ label: base.slice(1), href: `${base}/dashboard` }, { label: 'Settings' }]}
        actions={
          <Link
            href={`${base}/profile`}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-border-strong px-4 text-sm font-medium hover:bg-surface-muted"
          >
            <UserRound className="size-4" aria-hidden="true" />
            Edit profile
          </Link>
        }
      />

      <div className="max-w-3xl space-y-6">
        <ThemeCard />
        <ChangePasswordForm />
      </div>
    </div>
  );
}
