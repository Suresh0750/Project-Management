'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { PasswordField } from '@/components/ui/password-field';
import { PasswordRequirements } from '@/components/ui/password-requirements';
import { startCountdown } from '@/hooks/use-countdown';
import { generateMemorablePassword } from '@/utils/password';
import { TextField } from '@/components/ui/text-field';
import { useRegister } from '@/features/auth/hooks';
import { registerSchema, type RegisterValues } from '@/schemas/auth';
import { asApiError } from '@/lib/api/errors';

const FIELDS = ['name', 'email', 'password', 'confirmPassword'] as const;
const EMPTY: RegisterValues = { name: '', email: '', password: '', confirmPassword: '' };

export function RegisterForm() {
  const router = useRouter();
  const registerAccount = useRegister();
  const [passwordsVisible, setPasswordsVisible] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    reset,
    control,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    mode: 'onTouched',
    defaultValues: EMPTY,
  });

  // Never leave typed passwords behind when the page goes away.
  useEffect(() => () => reset(EMPTY), [reset]);

  // Fills both password fields, so the person only has to remember what was suggested.
  const fillGeneratedPassword = () => {
    const generated = generateMemorablePassword(getValues('name'), getValues('email'));
    if (!generated) {
      setError('name', { message: 'Enter your name or email first, then ask for a suggestion' });
      return;
    }
    setValue('password', generated, { shouldValidate: true, shouldDirty: true });
    setValue('confirmPassword', generated, { shouldValidate: true, shouldDirty: true });
    setPasswordsVisible(true);
  };

  const password = useWatch({ control, name: 'password' });

  const goToVerification = (email: string, cooldownSeconds: number) => {
    startCountdown(`verify:${email}`, cooldownSeconds);
    router.push(`/verify-email?email=${encodeURIComponent(email)}&sent=1`);
  };

  const submit = handleSubmit(({ name, email, password }) => {
    setFormError(null);
    registerAccount.mutate(
      { name, email, password },
      {
        // Use the address that was typed (the server stores it trimmed and lower-cased), so
        // navigation never depends on the shape of the response.
        onSuccess: (sent) =>
          goToVerification(email?.trim()?.toLowerCase(), sent?.resendAfterSeconds ?? 60),
        onError: (raw) => {
          const error = asApiError(raw);
          // A code for this address was just sent: carry on to the verification screen.
          if (error.status === 429 && error.fieldErrors.otp) {
            // "Please wait N seconds before requesting another code": N is the time really left.
            const wait = Number(/(\d+) second/.exec(error.message)?.[1]);
            goToVerification(email.trim().toLowerCase(), Number.isFinite(wait) && wait > 0 ? wait : 60);
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
        visible={passwordsVisible}
        onVisibleChange={setPasswordsVisible}
        error={errors.password?.message}
        {...register('password')}
      />
      <PasswordRequirements value={password} />
      <button
        type="button"
        onClick={fillGeneratedPassword}
        className="cursor-pointer text-sm font-medium text-primary hover:underline"
      >
        Suggest a password from my name and email
      </button>
      <PasswordField
        label="Confirm password"
        autoComplete="new-password"
        visible={passwordsVisible}
        onVisibleChange={setPasswordsVisible}
        error={errors.confirmPassword?.message}
        {...register('confirmPassword')}
      />

      <Button type="submit" fullWidth loading={registerAccount.isPending}>
        {registerAccount.isPending ? 'Creating account…' : 'Create account'}
      </Button>
    </form>
  );
}
