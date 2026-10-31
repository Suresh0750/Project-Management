'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm, useWatch, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { SelectField } from '@/components/ui/select-field';
import { TextareaField } from '@/components/ui/textarea-field';
import { TextField } from '@/components/ui/text-field';
import { useProject, useProjects } from '@/features/projects/hooks';
import { ApiError } from '@/lib/api/errors';
import { taskFormSchema, type TaskFormValues } from '@/schemas/task';
import { PRIORITIES, PRIORITY_LABEL } from '@/types/project';
import { TASK_STATUSES, TASK_STATUS_LABEL } from '@/types/task';

const PRIORITY_OPTIONS = PRIORITIES.map((value) => ({ value, label: PRIORITY_LABEL[value] }));
const STATUS_OPTIONS = TASK_STATUSES.map((value) => ({ value, label: TASK_STATUS_LABEL[value] }));
const FIELDS = [
  'title',
  'description',
  'projectId',
  'assigneeId',
  'priority',
  'status',
  'dueDate',
] as const;

interface TaskFormProps {
  mode: 'create' | 'edit';
  defaultValues?: Partial<TaskFormValues>;
  /** Assignees of their own tasks may only change the description. */
  descriptionOnly?: boolean;
  submitLabel: string;
  onSubmit: (values: TaskFormValues) => Promise<void>;
  onCancel?: () => void;
}

export function TaskForm({
  mode,
  defaultValues,
  descriptionOnly = false,
  submitLabel,
  onSubmit,
  onCancel,
}: TaskFormProps) {
  const isCreate = mode === 'create';
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    control,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema(mode)) as Resolver<TaskFormValues>,
    mode: 'onTouched',
    defaultValues: {
      title: '',
      description: '',
      projectId: '',
      assigneeId: '',
      priority: 'MEDIUM',
      status: 'TODO',
      dueDate: '',
      ...defaultValues,
    },
  });

  const projectId = useWatch({ control, name: 'projectId' });

  // Only projects the user can manage appear here (the server scopes the list by role).
  const projects = useProjects({ page: 1, limit: 100, archived: false }, isCreate);
  const project = useProject(projectId, isCreate && Boolean(projectId));

  const projectOptions = useMemo(
    () => (projects.data?.items ?? []).map((item) => ({ value: item.id, label: item.name })),
    [projects.data],
  );
  const assigneeOptions = useMemo(
    () =>
      (project.data?.members ?? [])
        .filter((member) => member.isActive)
        .map((member) => ({ value: member.id, label: `${member.name} (${member.email})` })),
    [project.data],
  );

  // Cache Components can keep a page alive in the background; discard entered data on leave.
  useEffect(
    () => () => {
      reset();
      setFormError(null);
    },
    [reset],
  );

  const submit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await onSubmit(values);
      reset(isCreate ? undefined : values);
    } catch (error) {
      if (!(error instanceof ApiError)) {
        setFormError('Unexpected error. Please try again.');
        return;
      }
      let mapped = false;
      for (const field of FIELDS) {
        const message = error.fieldErrors[field];
        if (message) {
          setError(field, { message });
          mapped = true;
        }
      }
      if (!mapped) setFormError(error.message);
    }
  });

  const assigneePlaceholder = !projectId
    ? 'Select a project first'
    : project.isPending
      ? 'Loading members…'
      : 'Unassigned';

  return (
    <form onSubmit={submit} onChange={() => setFormError(null)} noValidate className="space-y-5">
      {formError && <Alert tone="error">{formError}</Alert>}

      {!descriptionOnly && (
        <TextField label="Title" error={errors.title?.message} {...register('title')} />
      )}

      <TextareaField
        label="Description"
        placeholder="Add details, acceptance criteria or links"
        error={errors.description?.message}
        {...register('description')}
      />

      {isCreate && (
        <div className="grid gap-5 sm:grid-cols-2">
          <SelectField
            label="Project"
            placeholder={projects.isPending ? 'Loading projects…' : 'Select a project'}
            options={projectOptions}
            disabled={projects.isPending}
            error={errors.projectId?.message ?? (projects.isError ? projects.error.message : undefined)}
            {...register('projectId', { onChange: () => setValue('assigneeId', '') })}
          />
          <SelectField
            label="Assignee"
            placeholder={assigneePlaceholder}
            options={assigneeOptions}
            disabled={!projectId || project.isPending}
            hint="Only active members of the project can be assigned."
            error={errors.assigneeId?.message ?? (project.isError ? project.error.message : undefined)}
            {...register('assigneeId')}
          />
        </div>
      )}

      {!descriptionOnly && (
        <div className="grid gap-5 sm:grid-cols-2">
          <SelectField
            label="Priority"
            options={PRIORITY_OPTIONS}
            error={errors.priority?.message}
            {...register('priority')}
          />
          {isCreate && (
            <SelectField
              label="Status"
              options={STATUS_OPTIONS}
              error={errors.status?.message}
              {...register('status')}
            />
          )}
          <TextField
            label="Due date"
            type="date"
            error={errors.dueDate?.message}
            {...register('dueDate')}
          />
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <Button variant="secondary" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        )}
        <Button type="submit" loading={isSubmitting} disabled={!isCreate && !isDirty}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
