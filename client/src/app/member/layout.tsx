import { Suspense, type ReactNode } from 'react';
import { RoleLayout, ShellSkeleton } from '@/components/layout/role-layout';

export default function MemberLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<ShellSkeleton>{children}</ShellSkeleton>}>
      <RoleLayout role="MEMBER">{children}</RoleLayout>
    </Suspense>
  );
}
