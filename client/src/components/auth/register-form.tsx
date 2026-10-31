'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { PasswordField } from '@/components/ui/password-field';
import { TextField } from '@/components/ui/text-field';
import { useRegister } from '@/features/auth/hooks';
import { registerSchema, type RegisterValues } from '@/schemas/auth';
import { asApiError } from '@/lib/api/errors';

const FIELDS = ['name', 'email', 'password', 'confirmPassword'] as const;
const EMPTY: RegisterValues = { name: '', email: '', password: '', confirmPassword: '' };

export function RegisterForm() {
  const router = useRouter();
  const registerAccount = useRegister();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    mode: 'onTouched',
    defaultValues: EMPTY,
  });

  // Never leave typed passwords behind when the page goes away.
  useEffect(() => () => reset(EMPTY), [reset]);

  const goToVerification = (email: string) =>
    router.push(`/verify-email?email=${encodeURIComponent(email)}&sent=1`);

  const submit = handleSubmit(({ name, email, password }) => {
    setFormError(null);
    registerAccount.mutate(
      { name, email, password },
      {
        // Use the address that was typed (the server stores it trimmed and lower-cased), so
        // navigation never depends on the shape of the response.
        onSuccess: () => goToVerification(email?.trim()?.toLowerCase()),
        onError: (raw) => {
          const error = asApiError(raw);
          // A code for this address was just sent: carry on to the verification screen.
          if (error.status === 429 && error.fieldErrors.otp) {
            goToVerification(email.trim().toLowerCase());
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
        },
      },
    );
  });

  return (
    <form onSubmit={submit} onChange={() => setFormError(null)} noValidate className="space-y-4">
      {formError && <Alert tone="error">{formError}</Alert>}

      <TextField
        label="Full name"
        autoComplete="name"
        error={errors.name?.message}
        {...register('name')}
      />
      <TextField
        label="Email"
        type="email"
        autoComplete="email"
        placeholder="you@company.com"
        error={errors.email?.message}
        {...register('email')}
      />
      <PasswordField
        label="Password"
        autoComplete="new-password"
        hint="At least 8 characters with upper and lower case letters, a number and a symbol."
        error={errors.password?.message}
        {...register('password')}
      />
      <PasswordField
        label="Confirm password"
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        {...register('confirmPassword')}
      />

      <Button type="submit" fullWidth loading={registerAccount.isPending}>
        {registerAccount.isPending ? 'Creating account…' : 'Create account'}
      </Button>
    </form>
  );
}
