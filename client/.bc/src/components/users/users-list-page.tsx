'use client';

import Link from 'next/link';
import { useState } from 'react';
import { UserPlus, Users as UsersIcon, SearchX } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { DataTable, type Column } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { FilterDropdown } from '@/components/ui/filter-dropdown';
import { Pagination } from '@/components/ui/pagination';
import { SearchInput } from '@/components/ui/search-input';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast-provider';
import { UserAvatar } from '@/components/ui/user-avatar';
import { EmailVerifiedBadge, RoleBadge, UserStatusBadge } from '@/components/users/user-badges';
import { useSession } from '@/features/auth/hooks';
import { useUpdateUserStatus, useUsers } from '@/features/users/hooks';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { ROLE_LABEL } from '@/lib/auth/navigation';
import { USER_ROLE_FILTERS } from '@/schemas/user';
import { ROLES, type AuthUser, type Role } from '@/types/auth';
import { formatDate } from '@/utils/format';

const PAGE_SIZE = 10;
const ROLE_OPTIONS = USER_ROLE_FILTERS.map((role) => ({ value: role, label: ROLE_LABEL[role] }));
const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

export function UsersListPage() {
  const toast = useToast();
  const session = useSession();
  const updateStatus = useUpdateUserStatus();

  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pendingDeactivation, setPendingDeactivation] = useState<AuthUser | null>(null);

  const debouncedSearch = useDebouncedValue(search.trim());
  const users = useUsers({
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch,
    ...(isRole(role) ? { role } : {}),
    ...(status ? { isActive: status === 'active' } : {}),
  });

  const hasFilters = Boolean(search || role || status);
  const currentUserId = session.data?.id;

  const changeFilter = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    setPage(1);
  };

  const clearFilters = () => {
    setSearch('');
    setRole('');
    setStatus('');
    setPage(1);
  };

  const applyStatus = (user: AuthUser, isActive: boolean) => {
    updateStatus.mutate(
      { id: user.id, isActive },
      {
        onSuccess: () => toast.success(`${user.name} ${isActive ? 'activated' : 'deactivated'}`),
        onError: (error) => toast.error(error.message),
        onSettled: () => setPendingDeactivation(null),
      },
    );
  };

  const columns: Array<Column<AuthUser>> = [
    {
      key: 'user',
      header: 'User',
      cell: (user) => (
        <Link href={`/admin/users/${user.id}`} className="flex items-center gap-3 hover:underline">
          <UserAvatar name={user.name} />
          <span className="min-w-0">
            <span className="block truncate font-medium">{user.name}</span>
            <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
          </span>
        </Link>
      ),
    },
    { key: 'role', header: 'Role', cell: (user) => <RoleBadge role={user.role} /> },
    {
      key: 'status',
      header: 'Status',
      cell: (user) => (
        <div className="flex flex-wrap gap-1.5">
          <UserStatusBadge isActive={user.isActive} />
          {!user.emailVerifiedAt && <EmailVerifiedBadge verifiedAt={null} />}
        </div>
      ),
    },
    {
      key: 'created',
      header: 'Created',
      hideOnMobile: true,
      cell: (user) => <span className="text-muted-foreground">{formatDate(user.createdAt)}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      cell: (user) => {
        const isSelf = user.id === currentUserId;
        return (
          <div className="flex justify-end gap-2">
            <Link
              href={`/admin/users/${user.id}`}
              className="inline-flex h-8 items-center rounded-lg border border-border-strong px-3 text-xs font-medium hover:bg-surface-muted"
            >
              Edit
            </Link>
            {user.isActive ? (
              <Button
                variant="secondary"
                className="h-8 px-3 text-xs"
                disabled={isSelf}
                title={isSelf ? 'You cannot deactivate your own account' : undefined}
                onClick={() => setPendingDeactivation(user)}
              >
                Deactivate
              </Button>
            ) : (
              <Button
                variant="secondary"
                className="h-8 px-3 text-xs"
                loading={updateStatus.isPending && updateStatus.variables?.id === user.id}
                onClick={() => applyStatus(user, true)}
              >
                Activate
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  const rows = users.data?.items ?? [];

  let body;
  if (users.isError && !users.data) {
    body = (
      <ErrorState
        message={users.error.message}
        onRetry={() => users.refetch()}
        retrying={users.isFetching}
      />
    );
  } else if (users.data && rows.length === 0) {
    body = hasFilters ? (
      <EmptyState
        icon={SearchX}
        title="No users match your filters"
        description="Try a different search term or clear the filters."
        action={
          <Button variant="secondary" onClick={clearFilters}>
            Clear filters
          </Button>
        }
      />
    ) : (
      <EmptyState
        icon={UsersIcon}
        title="No users yet"
        description="Create the first Project Manager or Member account."
        action={
          <Link
            href="/admin/users/create"
            className="inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
          >
            Add user
          </Link>
        }
      />
    );
  } else {
    body = (
      <DataTable
        caption="Users"
        columns={columns}
        rows={rows}
        getRowKey={(user) => user.id}
        loading={users.isPending}
        refreshing={users.isFetching && !users.isPending}
        skeletonRows={PAGE_SIZE}
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="Users"
        description="Manage accounts, roles and access."
        breadcrumbs={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Users' }]}
        actions={
          <Link
            href="/admin/users/create"
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
          >
            <UserPlus className="size-4" aria-hidden="true" />
            Add user
          </Link>
        }
      />

      <div className="rounded-xl border border-border bg-surface">
        <div className="grid gap-3 border-b border-border p-4 sm:grid-cols-[1fr_180px_160px]">
          <SearchInput
            value={search}
            onChange={changeFilter(setSearch)}
            placeholder="Search by name or email"
            label="Search users"
          />
          <FilterDropdown
            label="Filter by role"
            allLabel="All roles"
            value={role}
            onChange={changeFilter(setRole)}
            options={ROLE_OPTIONS}
          />
          <FilterDropdown
            label="Filter by status"
            allLabel="All statuses"
            value={status}
            onChange={changeFilter(setStatus)}
            options={STATUS_OPTIONS}
          />
        </div>

        {body}

        {users.data && (
          <Pagination
            meta={users.data.meta}
            onPageChange={setPage}
            disabled={users.isFetching}
          />
        )}
      </div>

      <ConfirmDialog
        open={pendingDeactivation !== null}
        title="Deactivate user?"
        description={`${pendingDeactivation?.name ?? 'This user'} will be signed out and unable to log in until reactivated.`}
        confirmLabel="Deactivate"
        tone="danger"
        loading={updateStatus.isPending}
        onCancel={() => setPendingDeactivation(null)}
        onConfirm={() => pendingDeactivation && applyStatus(pendingDeactivation, false)}
      />
    </div>
  );
}
