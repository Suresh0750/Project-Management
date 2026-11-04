'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { PasswordField } from '@/components/ui/password-field';
import { Skeleton } from '@/components/ui/skeleton';
import { TextField } from '@/components/ui/text-field';
import { startCountdownIfIdle } from '@/hooks/use-countdown';
import { useLogin, useSession } from '@/features/auth/hooks';
import { loginSchema, type LoginValues } from '@/schemas/auth';
import { resolvePostLoginPath } from '@/utils/role-routes';
import { asApiError } from '@/lib/api/errors';

export function LoginFormSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
  );
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get('next');
  const reason = searchParams.get('reason');

  // The URL already says the session ended (we were just sent here because the account was
  // deactivated or the session expired), so there is nothing to ask the server. Asking again would
  // cost a request plus a refresh attempt and flash a skeleton before the form.
  const sessionKnownEnded =
    reason === 'deactivated' || reason === 'expired' || reason === 'role-changed';
  const session = useSession(!sessionKnownEnded);
  const login = useLogin();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    setFocus,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    mode: 'onTouched',
    shouldFocusError: true,
    defaultValues: { email: '', password: '' },
  });

  const clearFormError = () => setFormError(null);

  // A cached user whose latest check failed is a session that ended, not a signed-in user.
  // Trusting it would send us back to the dashboard that just sent us here.
  const signedInUser = session.isError ? undefined : session.data;

  // Already signed in: skip the form and go to the role dashboard.
  useEffect(() => {
    if (signedInUser) {
      router.replace(resolvePostLoginPath(signedInUser.role, nextPath));
    }
  }, [signedInUser, nextPath, router]);

  if ((session.isPending && !sessionKnownEnded) || signedInUser) {
    return <LoginFormSkeleton />;
  }

  const onSubmit = (values: LoginValues) => {
    setFormError(null);
    const credentials = { email: values.email.trim().toLowerCase(), password: values.password };
    login.mutate(credentials, {
      onSuccess: (user) => {
        router.replace(resolvePostLoginPath(user.role, nextPath));
      },
      onError: (raw) => {
        const error = asApiError(raw);
        // Right password but the email was never verified: the server just sent a fresh code.
        if (error.fieldErrors.code === 'EMAIL_NOT_VERIFIED') {
          startCountdownIfIdle(`verify:${credentials.email}`, 60);
          router.push(`/verify-email?email=${encodeURIComponent(credentials.email)}&sent=1`);
          return;
        }

        let mapped = false;
        for (const [field, message] of Object.entries(error.fieldErrors)) {
          if (field === 'email' || field === 'password') {
            setError(field, { message });
            mapped = true;
          }
        }
        // Anything not tied to a field (wrong credentials, deactivated account, …) goes in the banner.
        if (!mapped) {
          setFormError(error.message);
          // Wrong credentials: keep the email, send the user back to retype the password.
          if (error.status === 401) setFocus('password');
        }
      },
    });
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      onChange={clearFormError}
      noValidate
      className="space-y-4"
    >
      {reason === 'deactivated' && !formError && (
        <Alert tone="error">
          Your account has been deactivated. Please contact your administrator or the support team.
        </Alert>
      )}
      {reason === 'role-changed' && !formError && (
        <Alert tone="info">
          Your role has been changed by an administrator, so you were signed out. Sign in again to
          continue.
        </Alert>
      )}
      {reason === 'expired' && !formError && (
        <Alert tone="info">Your session has ended. Please sign in again.</Alert>
      )}
      {formError && <Alert tone="error">{formError}</Alert>}

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
        autoComplete="current-password"
        error={errors.password?.message}
        {...register('password')}
      />

      <div className="flex justify-end">
        <Link href="/forgot-password" className="text-sm font-medium text-primary hover:underline">
          Forgot password?
        </Link>
      </div>

      <Button type="submit" fullWidth loading={login.isPending}>
        {login.isPending ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  );
}
