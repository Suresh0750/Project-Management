'use client';

import { useState } from 'react';
import { BellOff, CheckCheck, SearchX } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import {
  NotificationItem,
  NotificationListSkeleton,
} from '@/components/notifications/notification-item';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { FilterDropdown } from '@/components/ui/filter-dropdown';
import { Pagination } from '@/components/ui/pagination';
import { useToast } from '@/components/ui/toast-provider';
import { useMarkAllRead, useMarkRead, useNotifications } from '@/features/notifications/hooks';
import { ROLE_BASE_PATH } from '@/lib/auth/navigation';
import type { Role } from '@/types/auth';
import {
  NOTIFICATION_TYPE_LABEL,
  NOTIFICATION_TYPES,
  type AppNotification,
} from '@/types/notification';

const PAGE_SIZE = 15;
const STATUS_OPTIONS = [
  { value: 'unread', label: 'Unread' },
  { value: 'read', label: 'Read' },
];
const TYPE_OPTIONS = NOTIFICATION_TYPES.map((value) => ({
  value,
  label: NOTIFICATION_TYPE_LABEL[value],
}));

export function NotificationsPage({ role }: { role: Role }) {
  const base = ROLE_BASE_PATH[role];
  const toast = useToast();
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);

  const typeFilter = NOTIFICATION_TYPES.find((value) => value === type);
  const notifications = useNotifications({
    page,
    limit: PAGE_SIZE,
    ...(status ? { unread: status === 'unread' } : {}),
    ...(typeFilter ? { type: typeFilter } : {}),
  });

  const hasFilters = Boolean(status || type);
  const unreadCount = notifications.data?.unreadCount ?? 0;
  const withReset = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    setPage(1);
  };

  // Opening a notification navigates (via its link) and marks it read quietly.
  const handleOpen = (notification: AppNotification) => {
    if (notification.readAt === null) markRead.mutate({ id: notification.id, wasUnread: true });
  };

  const handleMarkRead = (notification: AppNotification) => {
    markRead.mutate(
      { id: notification.id, wasUnread: true },
      {
        onSuccess: () => toast.success('Notification marked as read'),
        onError: (error) => toast.error(error.message),
      },
    );
  };

  const handleMarkAll = () => {
    markAllRead.mutate(undefined, {
      onSuccess: () => toast.success('All notifications marked as read'),
      onError: (error) => toast.error(error.message),
    });
  };

  let body;
  if (notifications.isError && !notifications.data) {
    body = (
      <ErrorState
        message={notifications.error.message}
        onRetry={() => notifications.refetch()}
        retrying={notifications.isFetching}
      />
    );
  } else if (notifications.isPending) {
    body = <NotificationListSkeleton rows={6} />;
  } else if (notifications.data.items.length === 0) {
    body = hasFilters ? (
      <EmptyState
        icon={SearchX}
        title="No notifications match your filters"
        action={
          <Button
            variant="secondary"
            onClick={() => {
              setStatus('');
              setType('');
              setPage(1);
            }}
          >
            Clear filters
          </Button>
        }
      />
    ) : (
      <EmptyState
        icon={BellOff}
        title="No notifications yet"
        description="You will be notified when you are assigned a task, a task changes, someone comments, or you are added to a project."
      />
    );
  } else {
    body = (
      <ul
        className={`divide-y divide-border ${notifications.isFetching ? 'opacity-60 transition-opacity' : ''}`}
      >
        {notifications.data.items.map((notification) => (
          <li key={notification.id} className="flex items-center">
            <div className="min-w-0 flex-1">
              <NotificationItem notification={notification} role={role} onOpen={handleOpen} />
            </div>
            {notification.readAt === null && (
              <Button
                variant="ghost"
                className="mr-3 h-8 shrink-0 px-2 text-xs"
                onClick={() => handleMarkRead(notification)}
                loading={markRead.isPending && markRead.variables?.id === notification.id}
                aria-label={`Mark "${notification.message}" as read`}
              >
                Mark as read
              </Button>
            )}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div>
      <PageHeader
        title="Notifications"
        description={
          unreadCount > 0 ? `You have ${unreadCount} unread.` : 'You are all caught up.'
        }
        breadcrumbs={[{ label: base.slice(1), href: `${base}/dashboard` }, { label: 'Notifications' }]}
        actions={
          <Button
            variant="secondary"
            onClick={handleMarkAll}
            loading={markAllRead.isPending}
            disabled={unreadCount === 0}
          >
            <CheckCheck className="size-4" aria-hidden="true" />
            Mark all as read
          </Button>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:max-w-xl">
        <FilterDropdown
          label="Filter by status"
          allLabel="All notifications"
          value={status}
          onChange={withReset(setStatus)}
          options={STATUS_OPTIONS}
        />
        <FilterDropdown
          label="Filter by type"
          allLabel="All types"
          value={type}
          onChange={withReset(setType)}
          options={TYPE_OPTIONS}
        />
      </div>

      <div className="rounded-xl border border-border bg-surface">
        {body}
        {notifications.data && (
          <Pagination
            meta={notifications.data.meta}
            onPageChange={setPage}
            disabled={notifications.isFetching}
          />
        )}
      </div>
    </div>
  );
}
