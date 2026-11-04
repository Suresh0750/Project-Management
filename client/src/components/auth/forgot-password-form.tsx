'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { useForgotPassword } from '@/features/auth/hooks';
import { startCountdown } from '@/hooks/use-countdown';
import { forgotPasswordSchema, type ForgotPasswordValues } from '@/schemas/auth';

export function ForgotPasswordForm() {
  const router = useRouter();
  const forgotPassword = useForgotPassword();
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
    const address = email.trim().toLowerCase();
    forgotPassword.mutate(address, {
      onSuccess: (sent) => {
        // The resend timer is saved for this address, so it carries on if the page is refreshed.
        startCountdown(`reset:${address}`, sent?.resendAfterSeconds ?? 60);
        router.push(`/reset-password?email=${encodeURIComponent(address)}`);
      },
      onError: (error) => setFormError(error.message),
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {formError && <Alert tone="error">{formError}</Alert>}

      <TextField
        label="Email"
        type="email"
        autoComplete="email"
        placeholder="you@company.com"
        hint="We will email a 6-digit code if an account exists for this address."
        error={errors.email?.message}
        {...register('email')}
      />

      <Button type="submit" fullWidth loading={forgotPassword.isPending}>
        {forgotPassword.isPending ? 'Sending…' : 'Send code'}
      </Button>
    </form>
  );
}
