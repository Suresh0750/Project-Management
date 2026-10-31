import Link from 'next/link';
import {
  Bell,
  FolderPlus,
  MessageSquare,
  ArrowRightLeft,
  UserCheck,
  type LucideIcon,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ROLE_BASE_PATH } from '@/lib/auth/navigation';
import type { Role } from '@/types/auth';
import type { AppNotification } from '@/types/notification';
import { cn } from '@/utils/cn';
import { formatRelativeTime } from '@/utils/format';

const TYPE_ICON: Record<string, LucideIcon> = {
  TASK_ASSIGNED: UserCheck,
  TASK_STATUS_CHANGED: ArrowRightLeft,
  TASK_COMMENT: MessageSquare,
  PROJECT_MEMBER_ADDED: FolderPlus,
};

/** Where clicking a notification should go: its task, else its project, else nowhere. */
export function notificationHref(notification: AppNotification, role: Role): string | null {
  const base = ROLE_BASE_PATH[role];
  if (notification.taskId) return `${base}/tasks/${notification.taskId}`;
  if (notification.projectId) return `${base}/projects/${notification.projectId}`;
  return null;
}

interface NotificationItemProps {
  notification: AppNotification;
  role: Role;
  /** Called when the notification is opened (e.g. to mark it as read). */
  onOpen: (notification: AppNotification) => void;
}

export function NotificationItem({ notification, role, onOpen }: NotificationItemProps) {
  const unread = notification.readAt === null;
  const Icon = TYPE_ICON[notification.type] ?? Bell;
  const href = notificationHref(notification, role);

  const content = (
    <>
      <span
        className={cn(
          'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full',
          unread ? 'bg-primary text-primary-foreground' : 'bg-surface-muted text-muted-foreground',
        )}
      >
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn('block break-words text-sm', unread && 'font-medium')}>
          {notification.message}
        </span>
        <time
          dateTime={notification.createdAt}
          className="mt-0.5 block text-xs text-muted-foreground"
        >
          {formatRelativeTime(notification.createdAt)}
        </time>
      </span>
      {unread && (
        <>
          <span aria-hidden="true" className="mt-2 size-2 shrink-0 rounded-full bg-primary" />
          <span className="sr-only">Unread</span>
        </>
      )}
    </>
  );

  const rowClass = cn(
    'flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-muted',
    unread && 'bg-info-soft/40',
  );

  return href ? (
    <Link href={href} onClick={() => onOpen(notification)} className={rowClass}>
      {content}
    </Link>
  ) : (
    <button type="button" onClick={() => onOpen(notification)} className={rowClass}>
      {content}
    </button>
  );
}

export function NotificationListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="divide-y divide-border" aria-busy="true" aria-label="Loading notifications">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex gap-3 px-4 py-3">
          <Skeleton className="size-8 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-3 w-1/4" />
          </div>
        </div>
      ))}
    </div>
  );
}
