'use client';

import { useState } from 'react';
import { useForm, useWatch, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { SelectField, type SelectOption } from '@/components/ui/select-field';
import { TextareaField } from '@/components/ui/textarea-field';
import { TextField } from '@/components/ui/text-field';
import { ApiError } from '@/lib/api/errors';
import { projectFormSchema, type ProjectFormValues } from '@/schemas/project';
import {
  PRIORITIES,
  PRIORITY_LABEL,
  PROJECT_STATUSES,
  PROJECT_STATUS_LABEL,
} from '@/types/project';

const STATUS_OPTIONS = PROJECT_STATUSES.map((value) => ({
  value,
  label: PROJECT_STATUS_LABEL[value],
}));
const PRIORITY_OPTIONS = PRIORITIES.map((value) => ({ value, label: PRIORITY_LABEL[value] }));
const FIELDS = [
  'name',
  'description',
  'priority',
  'status',
  'startDate',
  'deadline',
  'managerId',
] as const;

interface ProjectFormProps {
  defaultValues?: Partial<ProjectFormValues>;
  /** Administrators pick the Project Manager; managers always own what they create. */
  managerField?: { options: SelectOption[]; loading: boolean; error?: string };
  submitLabel: string;
  onSubmit: (values: ProjectFormValues) => Promise<void>;
  onCancel?: () => void;
}

export function ProjectForm({
  defaultValues,
  managerField,
  submitLabel,
  onSubmit,
  onCancel,
}: ProjectFormProps) {
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema(Boolean(managerField))) as Resolver<ProjectFormValues>,
    mode: 'onTouched',
    defaultValues: {
      name: '',
      description: '',
      priority: 'MEDIUM',
      status: 'PLANNING',
      startDate: '',
      deadline: '',
      managerId: '',
      ...defaultValues,
    },
  });

  const startDate = useWatch({ control, name: 'startDate' });

  const submit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await onSubmit(values);
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

  return (
    <form onSubmit={submit} onChange={() => setFormError(null)} noValidate className="space-y-5">
      {formError && <Alert tone="error">{formError}</Alert>}

      <TextField label="Project name" error={errors.name?.message} {...register('name')} />

      <TextareaField
        label="Description"
        placeholder="What is this project about?"
        error={errors.description?.message}
        {...register('description')}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField
          label="Priority"
          options={PRIORITY_OPTIONS}
          error={errors.priority?.message}
          {...register('priority')}
        />
        <SelectField
          label="Status"
          options={STATUS_OPTIONS}
          error={errors.status?.message}
          {...register('status')}
        />
        <TextField
          label="Start date"
          type="date"
          error={errors.startDate?.message}
          {...register('startDate')}
        />
        <TextField
          label="Deadline"
          type="date"
          min={startDate || undefined}
          error={errors.deadline?.message}
          {...register('deadline')}
        />
      </div>

      {managerField && (
        <SelectField
          label="Project Manager"
          placeholder={managerField.loading ? 'Loading managers…' : 'Select a Project Manager'}
          options={managerField.options}
          disabled={managerField.loading}
          error={errors.managerId?.message ?? managerField.error}
          {...register('managerId')}
        />
      )}

      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <Button variant="secondary" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        )}
        <Button type="submit" loading={isSubmitting} disabled={!isDirty && Boolean(defaultValues)}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
