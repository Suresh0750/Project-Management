import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { GuestOnly } from '@/components/auth/guest-only';
import { AuthShell } from '@/components/auth/auth-shell';
import { ResetPasswordForm } from '@/components/auth/reset-password-form';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata: Metadata = { title: 'Reset password · ProjectFlow' };

export default function ResetPasswordPage() {
  return (
    <AuthShell
      title="Set a new password"
      description="Enter the code we emailed you, then choose a strong password."
      footer={
        <Link href="/login" className="font-medium text-primary hover:underline">
          Back to sign in
        </Link>
      }
    >
      <Suspense fallback={<Skeleton className="h-40 w-full" />}>
        <GuestOnly>
          <ResetPasswordForm />
        </GuestOnly>
      </Suspense>
    </AuthShell>
  );
}
