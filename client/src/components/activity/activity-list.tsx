import Link from 'next/link';
import {
  Archive,
  ArrowRightLeft,
  FolderPlus,
  History,
  MessageSquare,
  Pencil,
  SquarePlus,
  Trash2,
  UserCheck,
  UserMinus,
  UserPlus,
  type LucideIcon,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { ActivityItem } from '@/types/activity';
import { formatDateTime } from '@/utils/format';

const ACTION_ICON: Record<string, LucideIcon> = {
  PROJECT_CREATED: FolderPlus,
  PROJECT_UPDATED: Pencil,
  PROJECT_ARCHIVED: Archive,
  MEMBER_ADDED: UserPlus,
  MEMBER_REMOVED: UserMinus,
  TASK_CREATED: SquarePlus,
  TASK_UPDATED: Pencil,
  TASK_STATUS_CHANGED: ArrowRightLeft,
  TASK_ASSIGNED: UserCheck,
  TASK_DELETED: Trash2,
  COMMENT_ADDED: MessageSquare,
};

interface ActivityListProps {
  items: ActivityItem[];
  /** Role route prefix (e.g. "/manager"); enables links to the project and task. */
  basePath?: string;
}

/** Read-only, newest-first feed. There are deliberately no edit or delete controls. */
export function ActivityList({ items, basePath }: ActivityListProps) {
  return (
    <ol className="divide-y divide-border">
      {items.map((item) => {
        const Icon = ACTION_ICON[item.action] ?? History;
        return (
          <li key={item.id} className="flex gap-3 px-5 py-3.5">
            <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-info-soft text-primary">
              <Icon className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="break-words text-sm">{item.message}</p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                <time dateTime={item.createdAt}>{formatDateTime(item.createdAt)}</time>
                {item.project && (
                  <>
                    <span aria-hidden="true">·</span>
                    {basePath ? (
                      <Link
                        href={`${basePath}/projects/${item.project.id}`}
                        className="hover:text-foreground hover:underline"
                      >
                        {item.project.name}
                      </Link>
                    ) : (
                      <span>{item.project.name}</span>
                    )}
                  </>
                )}
                {item.task && !item.task.deleted && basePath && (
                  <>
                    <span aria-hidden="true">·</span>
                    <Link
                      href={`${basePath}/tasks/${item.task.id}`}
                      className="hover:text-foreground hover:underline"
                    >
                      {item.task.title}
                    </Link>
                  </>
                )}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function ActivityListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="divide-y divide-border" aria-busy="true" aria-label="Loading activity">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex gap-3 px-5 py-3.5">
          <Skeleton className="size-8 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
