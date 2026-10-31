'use client';

import { useEffect } from 'react';
import { ErrorState } from '@/components/ui/error-state';

/** Last line of defence for unexpected render errors: never show internals to the user. */
export default function RootError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-full flex-1 items-center justify-center p-6">
      <ErrorState
        message="An unexpected error occurred. Please try again, or reload the page if it keeps happening."
        onRetry={retry}
      />
    </main>
  );
}
