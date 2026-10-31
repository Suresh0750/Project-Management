'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast-provider';
import { UserAvatar } from '@/components/ui/user-avatar';
import { RoleBadge, UserStatusBadge } from '@/components/users/user-badges';
import { UserForm } from '@/components/users/user-form';
import { useSession } from '@/features/auth/hooks';
import { useUpdateUser, useUpdateUserStatus, useUser } from '@/features/users/hooks';
import type { UpdateUserPayload } from '@/features/users/api';
import { ASSIGNABLE_ROLES, type UserFormValues } from '@/schemas/user';
import { formatDateTime } from '@/utils/format';

function DetailSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]" aria-busy="true" aria-label="Loading user">
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-80 w-full" />
    </div>
  );
}

export function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const session = useSession();
  const user = useUser(id);
  const updateUser = useUpdateUser(id);
  const updateStatus = useUpdateUserStatus();
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);

  if (user.isPending) return <DetailSkeleton />;

  if (user.isError) {
    const notFound = user.error.status === 404;
    return (
      <ErrorState
        title={notFound ? 'User not found' : 'Could not load user'}
        message={notFound ? 'This user does not exist or was removed.' : user.error.message}
        onRetry={notFound ? undefined : () => user.refetch()}
        retrying={user.isFetching}
        action={
          <Link
            href="/admin/users"
            className="inline-flex h-10 items-center rounded-lg border border-border-strong px-4 text-sm font-medium hover:bg-surface-muted"
          >
            Back to users
          </Link>
        }
      />
    );
  }

  const target = user.data;
  const isSelf = target.id === session.data?.id;
  const isAdminAccount = target.role === 'ADMIN';
  const roleLockedReason = isSelf
    ? 'You cannot change your own role.'
    : isAdminAccount
      ? 'Administrator roles cannot be changed.'
      : undefined;

  const handleSave = async (values: UserFormValues) => {
    const payload: UpdateUserPayload = {};
    if (values.name !== target.name) payload.name = values.name;
    if (values.email !== target.email) payload.email = values.email;
    if (!roleLockedReason && values.role !== target.role) {
      const role = ASSIGNABLE_ROLES.find((assignable) => assignable === values.role);
      if (role) payload.role = role;
    }

    const updated = await updateUser.mutateAsync(payload);
    toast.success(`${updated.name} was updated`);
  };

  const setActive = (isActive: boolean) => {
    updateStatus.mutate(
      { id: target.id, isActive },
      {
        onSuccess: () => toast.success(`User ${isActive ? 'activated' : 'deactivated'}`),
        onError: (error) => toast.error(error.message),
        onSettled: () => setConfirmDeactivate(false),
      },
    );
  };

  return (
    <div>
      <PageHeader
        title={target.name}
        description={target.email}
        breadcrumbs={[
          { label: 'Admin', href: '/admin/dashboard' },
          { label: 'Users', href: '/admin/users' },
          { label: target.name },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <section className="h-fit rounded-xl border border-border bg-surface p-6">
          <div className="flex flex-col items-center text-center">
            <UserAvatar name={target.name} className="size-16 text-lg" />
            <p className="mt-3 font-semibold">{target.name}</p>
            <p className="text-sm text-muted-foreground">{target.email}</p>
            <div className="mt-3 flex gap-2">
              <RoleBadge role={target.role} />
              <UserStatusBadge isActive={target.isActive} />
            </div>
          </div>

          <dl className="mt-6 space-y-3 border-t border-border pt-4 text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Created</dt>
              <dd>{formatDateTime(target.createdAt)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Last updated</dt>
              <dd>{formatDateTime(target.updatedAt)}</dd>
            </div>
          </dl>

          <div className="mt-6">
            {target.isActive ? (
              <Button
                variant="danger"
                fullWidth
                disabled={isSelf}
                title={isSelf ? 'You cannot deactivate your own account' : undefined}
                onClick={() => setConfirmDeactivate(true)}
              >
                Deactivate user
              </Button>
            ) : (
              <Button
                fullWidth
                loading={updateStatus.isPending}
                onClick={() => setActive(true)}
              >
                Activate user
              </Button>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-surface p-6">
          <h2 className="mb-4 text-base font-semibold">Edit details</h2>
          {/* Remount on server-side updates so the form baseline matches the saved user. */}
          <UserForm
            key={target.updatedAt}
            mode="edit"
            defaultValues={{ name: target.name, email: target.email, role: target.role }}
            {...(roleLockedReason ? { roleLockedReason } : {})}
            submitLabel="Save changes"
            onSubmit={handleSave}
          />
        </section>
      </div>

      <ConfirmDialog
        open={confirmDeactivate}
        title="Deactivate user?"
        description={`${target.name} will be signed out and unable to log in until reactivated.`}
        confirmLabel="Deactivate"
        tone="danger"
        loading={updateStatus.isPending}
        onCancel={() => setConfirmDeactivate(false)}
        onConfirm={() => setActive(false)}
      />
    </div>
  );
}
