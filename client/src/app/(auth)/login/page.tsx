import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthShell } from '@/components/auth/auth-shell';
import { LoginForm, LoginFormSkeleton } from '@/components/auth/login-form';

export const metadata: Metadata = { title: 'Sign in · ProjectFlow' };

export default function LoginPage() {
  return (
    <AuthShell
      title="Welcome back"
      description="Sign in to manage your projects and tasks."
      footer="Accounts are created by your administrator."
    >
      <Suspense fallback={<LoginFormSkeleton />}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
