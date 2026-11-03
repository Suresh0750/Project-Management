'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { useForgotPassword } from '@/features/auth/hooks';
import { forgotPasswordSchema, type ForgotPasswordValues } from '@/schemas/auth';

export function ForgotPasswordForm() {
  const forgotPassword = useForgotPassword();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = ({ email }: ForgotPasswordValues) => {
    setFormError(null);
    forgotPassword.mutate(email, {
      onSuccess: () => setSentTo(email),
      onError: (error) => {
        setFormError(
          error.status === 404
            ? 'Password reset is not available yet. Please contact an administrator.'
            : error.message,
        );
      },
    });
  };

  if (sentTo) {
    return (
      <div className="space-y-4">
        <Alert tone="success">
          If an account exists for <strong>{sentTo}</strong>, we have sent instructions to reset the
          password.
        </Alert>
        <Link
          href="/login"
          className="block text-center text-sm font-medium text-primary hover:underline"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {formError && <Alert tone="error">{formError}</Alert>}

      <TextField
        label="Email"
        type="email"
        autoComplete="email"
        placeholder="you@company.com"
        error={errors.email?.message}
        {...register('email')}
      />

      <Button type="submit" fullWidth loading={forgotPassword.isPending}>
        {forgotPassword.isPending ? 'Sending…' : 'Send reset link'}
      </Button>
    </form>
  );
}
