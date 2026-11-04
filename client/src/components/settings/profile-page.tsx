'use client';

import { PageHeader } from '@/components/layout/page-header';
import { ProfileForm } from '@/components/settings/profile-form';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { UserAvatar } from '@/components/ui/user-avatar';
import { RoleBadge, UserStatusBadge } from '@/components/users/user-badges';
import { UserProjectsCard } from '@/components/users/user-projects-card';
import { useProjects } from '@/features/projects/hooks';
import { useSession } from '@/features/auth/hooks';
import { ROLE_BASE_PATH } from '@/lib/auth/navigation';
import type { Role } from '@/types/auth';
import { formatDate } from '@/utils/format';

export function ProfilePage({ role }: { role: Role }) {
  const base = ROLE_BASE_PATH[role];
  const session = useSession();
  // The projects API is scoped by role: a manager gets the projects they manage, a member the
  // ones they belong to. Administrators see every project elsewhere, so nothing is listed here.
  const projects = useProjects({ page: 1, limit: 100, archived: false }, role !== 'ADMIN');

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

        {role !== 'ADMIN' && (
          <div className="lg:col-start-2">
            {projects.isPending ? (
              <Skeleton className="h-40 w-full" />
            ) : projects.isError ? (
              <ErrorState
                message={projects.error.message}
                onRetry={() => projects.refetch()}
                retrying={projects.isFetching}
              />
            ) : (
              <UserProjectsCard
                title={role === 'PROJECT_MANAGER' ? 'Projects you manage' : 'Your projects'}
                projects={projects.data.items}
                projectsPath={`${base}/projects`}
                emptyMessage={
                  role === 'PROJECT_MANAGER'
                    ? 'You do not manage any project yet.'
                    : 'You have not been added to any project yet.'
                }
              />
            )}
          </div>
        )}
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
