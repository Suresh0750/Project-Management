'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import {
  NotificationItem,
  NotificationListSkeleton,
} from '@/components/notifications/notification-item';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { useToast } from '@/components/ui/toast-provider';
import {
  useMarkAllRead,
  useMarkRead,
  useNotifications,
  useUnreadCount,
} from '@/features/notifications/hooks';
import { ROLE_BASE_PATH } from '@/lib/auth/navigation';
import type { Role } from '@/types/auth';
import type { AppNotification } from '@/types/notification';

const PREVIEW_SIZE = 8;

export function NotificationDropdown({ role }: { role: Role }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const unread = useUnreadCount();
  const notifications = useNotifications({ page: 1, limit: PREVIEW_SIZE }, open);
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  const unreadCount = unread.data ?? 0;
  const badge = unreadCount > 99 ? '99+' : String(unreadCount);

  // Close on outside click and Escape.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const handleOpen = (notification: AppNotification) => {
    setOpen(false);
    if (notification.readAt === null) {
      markRead.mutate({ id: notification.id, wasUnread: true });
    }
  };

  const handleMarkAll = () => {
    markAllRead.mutate(undefined, {
      onSuccess: () => toast.success('All notifications marked as read'),
      onError: (error) => toast.error(error.message),
    });
  };

  let body;
  if (notifications.isPending) {
    body = <NotificationListSkeleton />;
  } else if (notifications.isError) {
    body = (
      <ErrorState
        message={notifications.error.message}
        onRetry={() => notifications.refetch()}
        retrying={notifications.isFetching}
      />
    );
  } else if (notifications.data.items.length === 0) {
    body = (
      <EmptyState
        icon={BellOff}
        title="You're all caught up"
        description="New notifications will appear here."
      />
    );
  } else {
    body = (
      <ul className="max-h-96 divide-y divide-border overflow-y-auto">
        {notifications.data.items.map((notification) => (
          <li key={notification.id}>
            <NotificationItem notification={notification} role={role} onOpen={handleOpen} />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        aria-expanded={open}
        aria-haspopup="true"
        className="relative flex size-10 items-center justify-center rounded-lg text-foreground hover:bg-surface-muted"
      >
        <Bell className="size-5" aria-hidden="true" />
        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute right-1 top-1 flex min-w-4.5 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold leading-4.5 text-white"
          >
            {badge}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 top-12 z-40 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-border bg-surface shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">Notifications</h2>
            <Button
              variant="ghost"
              className="h-8 px-2 text-xs"
              onClick={handleMarkAll}
              loading={markAllRead.isPending}
              disabled={unreadCount === 0}
            >
              Mark all as read
            </Button>
          </div>
          {body}
          <div className="border-t border-border px-4 py-2.5 text-center">
            <Link
              href={`${ROLE_BASE_PATH[role]}/notifications`}
              onClick={() => setOpen(false)}
              className="text-sm font-medium text-primary hover:underline"
            >
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
