'use client';

import Link from 'next/link';
import { KanbanSquare, ListChecks, Plus } from 'lucide-react';
import { PriorityBadge } from '@/components/projects/project-badges';
import { TaskStatusBadge } from '@/components/tasks/task-badges';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useTasks } from '@/features/tasks/hooks';
import { ROLE_BASE_PATH } from '@/lib/auth/navigation';
import type { Role } from '@/types/auth';
import type { ProjectDetail } from '@/types/project';
import { isOverdue } from '@/types/task';
import { formatCalendarDate } from '@/utils/format';

const PREVIEW_SIZE = 8;

const linkClass =
  'inline-flex h-9 items-center gap-2 rounded-lg border border-border-strong px-3 text-sm font-medium hover:bg-surface-muted';

/** Compact task overview for a project, with links into the full list and board. */
export function ProjectTasksPanel({ project, role }: { project: ProjectDetail; role: Role }) {
  const tasksPath = `${ROLE_BASE_PATH[role]}/tasks`;
  const canCreate = project.canManage && !project.archivedAt;
  const tasks = useTasks({
    page: 1,
    limit: PREVIEW_SIZE,
    projectId: project.id,
    sortBy: 'createdAt',
    order: 'desc',
  });

  const newTask = canCreate ? (
    <Link href={`${tasksPath}/create?projectId=${project.id}`} className={linkClass}>
      <Plus className="size-4" aria-hidden="true" />
      New task
    </Link>
  ) : undefined;

  if (tasks.isPending) {
    return (
      <div className="space-y-3 rounded-xl border border-border bg-surface p-5" aria-busy="true">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (tasks.isError) {
    return (
      <div className="rounded-xl border border-border bg-surface">
        <ErrorState
          message={tasks.error.message}
          onRetry={() => tasks.refetch()}
          retrying={tasks.isFetching}
        />
      </div>
    );
  }

  const { items, meta } = tasks.data;

  return (
    <div className="rounded-xl border border-border bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-4">
        <h3 className="text-sm font-semibold">Tasks ({meta.total})</h3>
        <div className="flex gap-2">
          <Link href={`${tasksPath}?projectId=${project.id}&view=board`} className={linkClass}>
            <KanbanSquare className="size-4" aria-hidden="true" />
            Open board
          </Link>
          {newTask}
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="No tasks yet"
          description={canCreate ? 'Create the first task for this project.' : 'Tasks will appear here.'}
          action={newTask}
        />
      ) : (
        <ul className="divide-y divide-border">
          {items.map((task) => (
            <li key={task.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
              <Link
                href={`${tasksPath}/${task.id}`}
                className="min-w-0 flex-1 truncate text-sm font-medium hover:underline"
              >
                {task.title}
              </Link>
              <TaskStatusBadge status={task.status} />
              <PriorityBadge priority={task.priority} />
              <span className="hidden w-28 truncate text-xs text-muted-foreground sm:block">
                {task.assignee?.name ?? 'Unassigned'}
              </span>
              <span
                className={
                  isOverdue(task)
                    ? 'w-24 text-xs font-medium text-danger'
                    : 'w-24 text-xs text-muted-foreground'
                }
              >
                {task.dueDate ? formatCalendarDate(task.dueDate) : '—'}
              </span>
            </li>
          ))}
        </ul>
      )}

      {meta.total > PREVIEW_SIZE && (
        <div className="border-t border-border px-5 py-3 text-sm">
          <Link
            href={`${tasksPath}?projectId=${project.id}`}
            className="font-medium text-primary hover:underline"
          >
            View all {meta.total} tasks
          </Link>
        </div>
      )}
    </div>
  );
}
