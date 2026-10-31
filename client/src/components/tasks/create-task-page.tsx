'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/layout/page-header';
import { TaskForm } from '@/components/tasks/task-form';
import { useToast } from '@/components/ui/toast-provider';
import { toCreateTaskPayload } from '@/features/tasks/api';
import { useCreateTask } from '@/features/tasks/hooks';
import { ROLE_BASE_PATH } from '@/lib/auth/navigation';
import type { TaskFormValues } from '@/schemas/task';
import type { Role } from '@/types/auth';

export function CreateTaskPage({ role }: { role: Role }) {
  const router = useRouter();
  const toast = useToast();
  const createTask = useCreateTask();
  const presetProjectId = useSearchParams().get('projectId') ?? '';

  const base = ROLE_BASE_PATH[role];
  const tasksPath = `${base}/tasks`;

  const handleSubmit = async (values: TaskFormValues) => {
    const task = await createTask.mutateAsync(toCreateTaskPayload(values));
    toast.success(`Task "${task.title}" was created`);
    router.push(`${tasksPath}/${task.id}`);
  };

  return (
    <div>
      <PageHeader
        title="New task"
        description="Add a task to a project and optionally assign it."
        breadcrumbs={[
          { label: base.slice(1), href: `${base}/dashboard` },
          { label: 'Tasks', href: tasksPath },
          { label: 'New task' },
        ]}
      />
      <div className="max-w-2xl rounded-xl border border-border bg-surface p-6">
        <TaskForm
          mode="create"
          defaultValues={{ projectId: presetProjectId }}
          submitLabel="Create task"
          onSubmit={handleSubmit}
          onCancel={() => router.push(tasksPath)}
        />
      </div>
    </div>
  );
}
