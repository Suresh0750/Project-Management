'use client';

import Link from 'next/link';
import { Alert } from '@/components/ui/alert';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { TaskStatusBadge } from '@/components/tasks/task-badges';
import { useOpenTasks } from '@/features/projects/hooks';

interface OpenTasksDialogProps {
  open: boolean;
  projectId: string;
  /** e.g. "/manager/tasks": each task links to `${tasksPath}/${id}`. */
  tasksPath: string;
  onClose: () => void;
  /** "Go to tasks": the caller shows the project's Tasks tab. */
  onGoToTasks: () => void;
}

/** Shown when a project cannot be set to Completed because some of its tasks are still open. */
export function OpenTasksDialog({
  open,
  projectId,
  tasksPath,
  onClose,
  onGoToTasks,
}: OpenTasksDialogProps) {
  const openTasks = useOpenTasks(projectId, open);
  const total = openTasks.data?.total ?? 0;
  const shown = openTasks.data?.tasks ?? [];

  return (
    <ConfirmDialog
      open={open}
      title="This project cannot be completed yet"
      description="Every task must be completed first. Finish the tasks below, or set them to Completed, then try again."
      confirmLabel="Go to tasks"
      onCancel={onClose}
      onConfirm={onGoToTasks}
    >
      {openTasks.isPending && <Skeleton className="h-24 w-full" />}

      {openTasks.isError && <Alert tone="error">{openTasks.error.message}</Alert>}

      {openTasks.isSuccess && (
        <div className="space-y-2">
          <p className="text-sm font-medium">
            {total} {total === 1 ? 'task is' : 'tasks are'} not completed
          </p>
          <ul className="max-h-56 divide-y divide-border overflow-y-auto rounded-lg border border-border">
            {shown.map((task) => (
              <li key={task.id}>
                <Link
                  href={`${tasksPath}/${task.id}`}
                  className="flex items-center justify-between gap-3 px-3 py-2 text-sm hover:bg-surface-muted"
                >
                  <span className="min-w-0 truncate">{task.title}</span>
                  <TaskStatusBadge status={task.status} />
                </Link>
              </li>
            ))}
          </ul>
          {total > shown.length && (
            <p className="text-xs text-muted-foreground">and {total - shown.length} more</p>
          )}
        </div>
      )}
    </ConfirmDialog>
  );
}
