'use client';

import { usePathname } from 'next/navigation';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

function titleFromPath(pathname: string): string {
  const segment = pathname.split('/').filter(Boolean)[1] ?? 'dashboard';
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}

function PlaceholderBody() {
  const title = titleFromPath(usePathname());

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">This page is built in an upcoming phase.</p>
    </div>
  );
}

/** Temporary body for routes whose real pages arrive in a later phase. */
export function ModulePlaceholder() {
  return (
    <Suspense fallback={<Skeleton className="h-8 w-48" />}>
      <PlaceholderBody />
    </Suspense>
  );
}
