'use client';

import { useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Copy, Wand2 } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { PasswordField } from '@/components/ui/password-field';
import { SelectField } from '@/components/ui/select-field';
import { TextField } from '@/components/ui/text-field';
import { useToast } from '@/components/ui/toast-provider';
import { ApiError } from '@/lib/api/errors';
import { ROLE_LABEL } from '@/lib/auth/navigation';
import {
  ASSIGNABLE_ROLES,
  createUserSchema,
  editUserSchema,
  type UserFormValues,
} from '@/schemas/user';
import { generatePassword } from '@/utils/password';

const ROLE_OPTIONS = ASSIGNABLE_ROLES.map((role) => ({ value: role, label: ROLE_LABEL[role] }));
const FIELDS = ['name', 'email', 'role', 'password'] as const;

interface UserFormProps {
  mode: 'create' | 'edit';
  defaultValues?: Partial<UserFormValues>;
  /** Locks the role select (e.g. editing yourself or an administrator). */
  roleLockedReason?: string;
  submitLabel: string;
  onSubmit: (values: UserFormValues) => Promise<void>;
  onCancel?: () => void;
}

export function UserForm({
  mode,
  defaultValues,
  roleLockedReason,
  submitLabel,
  onSubmit,
  onCancel,
}: UserFormProps) {
  const toast = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const [passwordVisible, setPasswordVisible] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    getValues,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<UserFormValues>({
    resolver: zodResolver(
      mode === 'create' ? createUserSchema : editUserSchema,
    ) as Resolver<UserFormValues>,
    mode: 'onTouched',
    defaultValues: { name: '', email: '', role: 'MEMBER', password: '', ...defaultValues },
  });

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
      // Duplicate email arrives as a plain 409 rather than a field error.
      if (error.status === 409) {
        setError('email', { message: error.message });
        mapped = true;
      }
      if (!mapped) setFormError(error.message);
    }
  });

  const fillGeneratedPassword = () => {
    setValue('password', generatePassword(), { shouldValidate: true, shouldDirty: true });
    setPasswordVisible(true);
  };

  const copyPassword = async () => {
    try {
      await navigator.clipboard.writeText(getValues('password'));
      toast.success('Password copied to clipboard');
    } catch {
      toast.error('Could not copy. Select the password and copy it manually.');
    }
  };

  return (
    <form onSubmit={submit} onChange={() => setFormError(null)} noValidate className="space-y-5">
      {formError && <Alert tone="error">{formError}</Alert>}

      <TextField
        label="Full name"
        autoComplete="off"
        error={errors.name?.message}
        {...register('name')}
      />

      <TextField
        label="Email"
        type="email"
        autoComplete="off"
        error={errors.email?.message}
        {...register('email')}
      />

      {roleLockedReason ? (
        <TextField
          label="Role"
          value={ROLE_LABEL[getValues('role')]}
          readOnly
          hint={roleLockedReason}
        />
      ) : (
        <SelectField
          label="Role"
          options={ROLE_OPTIONS}
          error={errors.role?.message}
          {...register('role')}
        />
      )}

      {mode === 'create' && (
        <div className="space-y-2">
          <PasswordField
            label="Temporary password"
            autoComplete="new-password"
            visible={passwordVisible}
            onVisibleChange={setPasswordVisible}
            hint="At least 8 characters with upper and lower case letters, a number and a symbol."
            error={errors.password?.message}
            {...register('password')}
          />
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={fillGeneratedPassword}>
              <Wand2 className="size-4" aria-hidden="true" />
              Generate secure password
            </Button>
            <Button variant="ghost" onClick={copyPassword}>
              <Copy className="size-4" aria-hidden="true" />
              Copy
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Share this password with the user through a secure channel. It is not shown again after
            the account is created.
          </p>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <Button variant="secondary" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        )}
        <Button type="submit" loading={isSubmitting} disabled={mode === 'edit' && !isDirty}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
