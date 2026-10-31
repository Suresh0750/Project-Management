'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { PasswordField } from '@/components/ui/password-field';
import { useToast } from '@/components/ui/toast-provider';
import { useResetPassword } from '@/features/auth/hooks';
import { resetPasswordSchema, type ResetPasswordValues } from '@/schemas/auth';

export function ResetPasswordForm() {
  const router = useRouter();
  const token = useSearchParams().get('token');
  const toast = useToast();
  const resetPassword = useResetPassword();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  if (!token) {
    return (
      <div className="space-y-4">
        <Alert tone="error">This reset link is invalid or incomplete.</Alert>
        <Link
          href="/forgot-password"
          className="block text-center text-sm font-medium text-primary hover:underline"
        >
          Request a new link
        </Link>
      </div>
    );
  }

  const onSubmit = ({ password }: ResetPasswordValues) => {
    setFormError(null);
    resetPassword.mutate(
      { token, password },
      {
        onSuccess: () => {
          toast.success('Password updated. Sign in with your new password.');
          router.replace('/login');
        },
        onError: (error) => {
          if (error.fieldErrors.password) {
            setError('password', { message: error.fieldErrors.password });
            return;
          }
          setFormError(
            error.status === 404
              ? 'Password reset is not available yet. Please contact an administrator.'
              : error.message,
          );
        },
      },
    );
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {formError && <Alert tone="error">{formError}</Alert>}

      <PasswordField
        label="New password"
        autoComplete="new-password"
        hint="At least 8 characters with upper and lower case letters, a number and a symbol."
        error={errors.password?.message}
        {...register('password')}
      />

      <PasswordField
        label="Confirm new password"
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        {...register('confirmPassword')}
      />

      <Button type="submit" fullWidth loading={resetPassword.isPending}>
        {resetPassword.isPending ? 'Updating…' : 'Update password'}
      </Button>
    </form>
  );
}
