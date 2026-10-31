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
import { useLogin, useSession } from '@/features/auth/hooks';
import { loginSchema, type LoginValues } from '@/schemas/auth';
import { resolvePostLoginPath } from '@/utils/role-routes';

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

  const session = useSession();
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

  // Already signed in: skip the form and go to the role dashboard.
  useEffect(() => {
    if (session.data) {
      router.replace(resolvePostLoginPath(session.data.role, nextPath));
    }
  }, [session.data, nextPath, router]);

  if (session.isPending || session.data) {
    return <LoginFormSkeleton />;
  }

  const onSubmit = (values: LoginValues) => {
    setFormError(null);
    const credentials = { email: values.email.trim().toLowerCase(), password: values.password };
    login.mutate(credentials, {
      onSuccess: (user) => {
        router.replace(resolvePostLoginPath(user.role, nextPath));
      },
      onError: (error) => {
        const fieldEntries = Object.entries(error.fieldErrors);
        for (const [field, message] of fieldEntries) {
          if (field === 'email' || field === 'password') setError(field, { message });
        }
        if (fieldEntries.length === 0) {
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
