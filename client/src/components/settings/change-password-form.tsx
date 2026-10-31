'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { PasswordField } from '@/components/ui/password-field';
import { useToast } from '@/components/ui/toast-provider';
import { useChangePassword } from '@/features/auth/hooks';
import { changePasswordSchema, type ChangePasswordValues } from '@/schemas/auth';
import { asApiError } from '@/lib/api/errors';

const FIELDS = ['currentPassword', 'newPassword', 'confirmPassword'] as const;
const EMPTY: ChangePasswordValues = { currentPassword: '', newPassword: '', confirmPassword: '' };

export function ChangePasswordForm() {
  const toast = useToast();
  const changePassword = useChangePassword();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isDirty },
  } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    mode: 'onTouched',
    defaultValues: EMPTY,
  });

  // Never leave typed passwords behind when the page goes away.
  useEffect(() => () => reset(EMPTY), [reset]);

  const submit = handleSubmit((values) => {
    setFormError(null);
    changePassword.mutate(
      { currentPassword: values.currentPassword, newPassword: values.newPassword },
      {
        onSuccess: () => {
          toast.success('Password updated. Your other devices were signed out.');
          reset(EMPTY);
        },
        onError: (raw) => {
          const error = asApiError(raw);
          let mapped = false;
          for (const field of FIELDS) {
            const message = error.fieldErrors[field];
            if (message) {
              setError(field, { message });
              mapped = true;
            }
          }
          if (!mapped) setFormError(error.message);
        },
      },
    );
  });

  return (
    <section className="rounded-xl border border-border bg-surface p-6">
      <h2 className="text-base font-semibold">Change password</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        You will stay signed in here; every other device is signed out.
      </p>

      <form
        onSubmit={submit}
        onChange={() => setFormError(null)}
        noValidate
        className="mt-4 max-w-md space-y-4"
      >
        {formError && <Alert tone="error">{formError}</Alert>}

        <PasswordField
          label="Current password"
          autoComplete="current-password"
          error={errors.currentPassword?.message}
          {...register('currentPassword')}
        />
        <PasswordField
          label="New password"
          autoComplete="new-password"
          hint="At least 8 characters with upper and lower case letters, a number and a symbol."
          error={errors.newPassword?.message}
          {...register('newPassword')}
        />
        <PasswordField
          label="Confirm new password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        <div className="flex justify-end">
          <Button type="submit" loading={changePassword.isPending} disabled={!isDirty}>
            Update password
          </Button>
        </div>
      </form>
    </section>
  );
}
