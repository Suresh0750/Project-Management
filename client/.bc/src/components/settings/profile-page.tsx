'use client';

import { PageHeader } from '@/components/layout/page-header';
import { ProfileForm } from '@/components/settings/profile-form';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { UserAvatar } from '@/components/ui/user-avatar';
import { RoleBadge, UserStatusBadge } from '@/components/users/user-badges';
import { useSession } from '@/features/auth/hooks';
import { ROLE_BASE_PATH } from '@/lib/auth/navigation';
import type { Role } from '@/types/auth';
import { formatDate } from '@/utils/format';

export function ProfilePage({ role }: { role: Role }) {
  const base = ROLE_BASE_PATH[role];
  const session = useSession();

  let body;
  if (session.isPending) {
    body = (
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]" aria-busy="true" aria-label="Loading profile">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  } else if (session.isError) {
    body = (
      <ErrorState
        message={session.error.message}
        onRetry={() => session.refetch()}
        retrying={session.isFetching}
      />
    );
  } else {
    const user = session.data;
    body = (
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <section className="h-fit rounded-xl border border-border bg-surface p-6">
          <div className="flex flex-col items-center text-center">
            <UserAvatar name={user.name} className="size-16 text-lg" />
            <p className="mt-3 font-semibold">{user.name}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <div className="mt-3 flex gap-2">
              <RoleBadge role={user.role} />
              <UserStatusBadge isActive={user.isActive} />
            </div>
          </div>
          <dl className="mt-6 space-y-3 border-t border-border pt-4 text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Member since</dt>
              <dd>{formatDate(user.createdAt)}</dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-muted-foreground">
            Your role is managed by an administrator and cannot be changed here.
          </p>
        </section>

        <section className="rounded-xl border border-border bg-surface p-6">
          <h2 className="mb-4 text-base font-semibold">Personal information</h2>
          {/* Remount when the saved profile changes so the form baseline stays correct. */}
          <ProfileForm key={`${user.updatedAt}-${user.email}`} user={user} />
        </section>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Profile"
        description="Your personal details."
        breadcrumbs={[{ label: base.slice(1), href: `${base}/dashboard` }, { label: 'Profile' }]}
      />
      {body}
    </div>
  );
}
