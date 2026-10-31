import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { AuthShell } from '@/components/auth/auth-shell';
import { VerifyEmailForm } from '@/components/auth/verify-email-form';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata: Metadata = { title: 'Verify email · ProjectFlow' };

export default function VerifyEmailPage() {
  return (
    <AuthShell
      title="Verify your email"
      description="Enter the 6-digit code we sent to your inbox."
      footer={
        <Link href="/login" className="font-medium text-primary hover:underline">
          Back to sign in
        </Link>
      }
    >
      <Suspense fallback={<Skeleton className="h-56 w-full" />}>
        <VerifyEmailForm />
      </Suspense>
    </AuthShell>
  );
}
