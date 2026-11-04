'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { PasswordField } from '@/components/ui/password-field';
import { PasswordRequirements } from '@/components/ui/password-requirements';
import { TextField } from '@/components/ui/text-field';
import { useToast } from '@/components/ui/toast-provider';
import { useForgotPassword, useResetPassword } from '@/features/auth/hooks';
import { useCountdown } from '@/hooks/use-countdown';
import { resetPasswordSchema, type ResetPasswordValues } from '@/schemas/auth';
import { asApiError } from '@/lib/api/errors';

export function ResetPasswordForm() {
  const router = useRouter();
  const initialEmail = useSearchParams().get('email') ?? '';
  const toast = useToast();
  const resetPassword = useResetPassword();
  const resend = useForgotPassword();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    reset,
    trigger,
    getValues,
    control,
    formState: { errors },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    mode: 'onTouched',
    defaultValues: { email: initialEmail, otp: '', password: '', confirmPassword: '' },
  });

  const password = useWatch({ control, name: 'password' });
  const typedEmail = useWatch({ control, name: 'email' });
  // The saved deadline belongs to the address, so a refresh carries on from the real time left.
  const { remaining, start } = useCountdown(`reset:${(typedEmail ?? '').trim().toLowerCase()}`);

  // Never leave a typed code or password behind when the page goes away.
  useEffect(() => () => reset({ email: '', otp: '', password: '', confirmPassword: '' }), [reset]);

  const onSubmit = ({ email, otp, password }: ResetPasswordValues) => {
    setFormError(null);
    resetPassword.mutate(
      { email: email.trim().toLowerCase(), otp, password },
      {
        onSuccess: () => {
          toast.success('Password updated. Sign in with your new password.');
          router.replace('/login');
        },
        onError: (raw) => {
          const error = asApiError(raw);
          const otpMessage = error.fieldErrors.otp;
          if (otpMessage) {
            setError('otp', { message: otpMessage });
            return;
          }
          if (error.fieldErrors.newPassword) {
            setError('password', { message: error.fieldErrors.newPassword });
            return;
          }
          setFormError(error.message);
        },
      },
    );
  };

  const resendCode = async () => {
    if (!(await trigger('email'))) return;
    setFormError(null);
    const address = getValues('email').trim().toLowerCase();
    resend.mutate(address, {
      onSuccess: (sent) => {
        toast.success('If an account exists for that address, a new code is on its way.');
        start(sent?.resendAfterSeconds ?? 60);
      },
      onError: (error) => setFormError(error.message),
    });
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      onChange={() => setFormError(null)}
      noValidate
      className="space-y-4"
    >
      {formError && <Alert tone="error">{formError}</Alert>}

      <TextField
        label="Email"
        type="email"
        autoComplete="email"
        error={errors.email?.message}
        {...register('email')}
      />

      <TextField
        label="Verification code"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        placeholder="••••••"
        className="text-center text-xl font-semibold tracking-[0.5em]"
        error={errors.otp?.message}
        {...register('otp', {
          // Digits only, so a pasted code with spaces or dashes still works.
          setValueAs: (value: string) => value.replace(/\D/g, ''),
        })}
      />

      <PasswordField
        label="New password"
        autoComplete="new-password"
        error={errors.password?.message}
        {...register('password')}
      />
      <PasswordRequirements value={password} />

      <PasswordField
        label="Confirm new password"
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        {...register('confirmPassword')}
      />

      <Button type="submit" fullWidth loading={resetPassword.isPending}>
        {resetPassword.isPending ? 'Updating…' : 'Update password'}
      </Button>

      <Button
        variant="ghost"
        fullWidth
        onClick={() => void resendCode()}
        loading={resend.isPending}
        disabled={remaining > 0}
      >
        {remaining > 0 ? `Resend code in ${remaining}s` : 'Resend code'}
      </Button>
    </form>
  );
}
