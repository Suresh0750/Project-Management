'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { CommentList } from '@/components/comments/comment-list';
import { PageHeader } from '@/components/layout/page-header';
import { PriorityBadge } from '@/components/projects/project-badges';
import { ActivityTimeline } from '@/components/tasks/activity-timeline';
import { TaskForm } from '@/components/tasks/task-form';
import { TaskStatusBadge } from '@/components/tasks/task-badges';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ErrorState } from '@/components/ui/error-state';
import { SelectField } from '@/components/ui/select-field';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast-provider';
import { useProject } from '@/features/projects/hooks';
import { toCreateTaskPayload, type UpdateTaskPayload } from '@/features/tasks/api';
import {
  useAssignTask,
  useDeleteTask,
  useTask,
  useUpdateTask,
  useUpdateTaskStatus,
} from '@/features/tasks/hooks';
import { ROLE_BASE_PATH } from '@/lib/auth/navigation';
import type { TaskFormValues } from '@/schemas/task';
import type { Role } from '@/types/auth';
import { isOverdue, TASK_STATUS_LABEL, TASK_STATUSES, type TaskStatus } from '@/types/task';
import { formatCalendarDate, formatDateTime, toDateInputValue } from '@/utils/format';

const STATUS_OPTIONS = TASK_STATUSES.map((value) => ({ value, label: TASK_STATUS_LABEL[value] }));

function DetailSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading task">
      <Skeleton className="h-8 w-72" />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}

export function TaskDetailPage({ role }: { role: Role }) {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const task = useTask(id);
  const updateTask = useUpdateTask(id);
  const updateStatus = useUpdateTaskStatus();
  const assignTask = useAssignTask(id);
  const deleteTask = useDeleteTask();

  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const base = ROLE_BASE_PATH[role];
  const tasksPath = `${base}/tasks`;

  const canAssign = task.data?.permissions.canAssign ?? false;
  const project = useProject(task.data?.projectId ?? '', canAssign);
  const assigneeOptions = useMemo(
    () =>
      (project.data?.members ?? [])
        .filter((member) => member.isActive || member.id === task.data?.assigneeId)
        .map((member) => ({ value: member.id, label: member.name })),
    [project.data, task.data?.assigneeId],
  );

  if (task.isPending) return <DetailSkeleton />;

  if (task.isError) {
    const notFound = task.error.status === 404;
    return (
      <ErrorState
        title={notFound ? 'Task not found' : 'Could not load task'}
        message={
          notFound
            ? 'This task does not exist, was deleted, or you do not have access to it.'
            : task.error.message
        }
        onRetry={notFound ? undefined : () => task.refetch()}
        retrying={task.isFetching}
        action={
          <Link
            href={tasksPath}
            className="inline-flex h-10 items-center rounded-lg border border-border-strong px-4 text-sm font-medium hover:bg-surface-muted"
          >
            Back to tasks
          </Link>
        }
      />
    );
  }

  const data = task.data;
  const { permissions } = data;
  const readOnlyProject = Boolean(data.project.archivedAt);

  const handleSave = async (values: TaskFormValues) => {
    const full = toCreateTaskPayload(values);
    const payload: UpdateTaskPayload = {};
    if (permissions.canEditAllFields) {
      if (full.title !== data.title) payload.title = full.title;
      if (full.priority !== data.priority) payload.priority = full.priority;
      if (full.dueDate !== (data.dueDate ? toDateInputValue(data.dueDate) : null)) {
        payload.dueDate = full.dueDate;
      }
    }
    if (full.description !== data.description) payload.description = full.description;

    await updateTask.mutateAsync(payload);
    toast.success('Task updated');
    setEditing(false);
  };

  const changeStatus = (status: string) => {
    const next = TASK_STATUSES.find((value) => value === status);
    if (!next || next === data.status) return;
    updateStatus.mutate(
      { id: data.id, status: next as TaskStatus },
      {
        onSuccess: () => toast.success(`Status changed to ${TASK_STATUS_LABEL[next]}`),
        onError: (error) => toast.error(error.message),
      },
    );
  };

  const changeAssignee = (assigneeId: string) => {
    assignTask.mutate(assigneeId === '' ? null : assigneeId, {
      onSuccess: () => toast.success(assigneeId === '' ? 'Task unassigned' : 'Task assigned'),
      onError: (error) => toast.error(error.message),
    });
  };

  const confirmDeletion = () => {
    deleteTask.mutate(data.id, {
      onSuccess: () => {
        toast.success('Task deleted');
        router.replace(tasksPath);
      },
      onError: (error) => {
        toast.error(error.message);
        setConfirmDelete(false);
      },
    });
  };

  const row = (label: string, value: React.ReactNode) => (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium">{value}</dd>
    </div>
  );

  return (
    <div>
      <PageHeader
        title={data.title}
        breadcrumbs={[
          { label: base.slice(1), href: `${base}/dashboard` },
          { label: 'Tasks', href: tasksPath },
          { label: data.title },
        ]}
        actions={
          <>
            {permissions.canEdit && (
              <Button variant="secondary" onClick={() => setEditing((current) => !current)}>
                <Pencil className="size-4" aria-hidden="true" />
                {editing ? 'Cancel edit' : 'Edit'}
              </Button>
            )}
            {permissions.canDelete && (
              <Button variant="secondary" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="size-4" aria-hidden="true" />
                Delete
              </Button>
            )}
          </>
        }
      />

      {readOnlyProject && (
        <div className="mb-4">
          <Alert tone="info">This task is read-only because its project is archived.</Alert>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <section className="rounded-xl border border-border bg-surface p-6">
            {editing && permissions.canEdit ? (
              <TaskForm
                key={data.updatedAt}
                mode="edit"
                descriptionOnly={!permissions.canEditAllFields}
                defaultValues={{
                  title: data.title,
                  description: data.description ?? '',
                  priority: data.priority,
                  status: data.status,
                  dueDate: toDateInputValue(data.dueDate),
                  projectId: data.projectId,
                  assigneeId: data.assigneeId ?? '',
                }}
                submitLabel="Save changes"
                onSubmit={handleSave}
                onCancel={() => setEditing(false)}
              />
            ) : (
              <>
                <h2 className="text-base font-semibold">Description</h2>
                <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                  {data.description ?? 'No description provided.'}
                </p>
              </>
            )}
          </section>

          <CommentList taskId={data.id} canComment={permissions.canComment} />
          <ActivityTimeline taskId={data.id} />
        </div>

        <aside className="h-fit space-y-5 rounded-xl border border-border bg-surface p-6">
          {permissions.canChangeStatus ? (
            <SelectField
              label="Status"
              options={STATUS_OPTIONS}
              value={data.status}
              disabled={updateStatus.isPending}
              onChange={(event) => changeStatus(event.target.value)}
            />
          ) : (
            <dl>{row('Status', <TaskStatusBadge status={data.status} />)}</dl>
          )}

          {permissions.canAssign ? (
            <SelectField
              label="Assignee"
              placeholder="Unassigned"
              options={assigneeOptions}
              value={data.assigneeId ?? ''}
              disabled={assignTask.isPending || project.isPending}
              onChange={(event) => changeAssignee(event.target.value)}
            />
          ) : (
            <dl>{row('Assignee', data.assignee?.name ?? 'Unassigned')}</dl>
          )}

          <dl className="space-y-4 border-t border-border pt-5">
            {row('Priority', <PriorityBadge priority={data.priority} />)}
            {row(
              'Due date',
              data.dueDate ? (
                <span className={isOverdue(data) ? 'text-danger' : undefined}>
                  {formatCalendarDate(data.dueDate)}
                  {isOverdue(data) && ' (overdue)'}
                </span>
              ) : (
                'Not set'
              ),
            )}
            {row(
              'Project',
              <Link
                href={`${base}/projects/${data.project.id}`}
                className="text-primary hover:underline"
              >
                {data.project.name}
              </Link>,
            )}
            {row('Created by', data.creator.name)}
            {row('Created', formatDateTime(data.createdAt))}
            {row('Last updated', formatDateTime(data.updatedAt))}
          </dl>
        </aside>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete task?"
        description="This task will be removed from the project. Its history is kept in the project activity."
        confirmLabel="Delete"
        tone="danger"
        loading={deleteTask.isPending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={confirmDeletion}
      />
    </div>
  );
}
