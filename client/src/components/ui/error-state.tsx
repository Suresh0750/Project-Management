'use client';

import { useState, type ReactNode } from 'react';
import { LoaderCircle, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorStateProps {
  title?: string;
  message: string;
  /**
   * Called by "Try again". If it returns a promise (for example a query's `refetch()`), the loader
   * shows until it settles. The loader always stays up for a moment, so a retry that fails again
   * instantly still visibly happened.
   */
  onRetry?: () => unknown;
  /** Keeps the loader up while the caller is fetching (in addition to the built-in one). */
  retrying?: boolean;
  action?: ReactNode;
}

const MINIMUM_LOADER_MS = 600;

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  retrying,
  action,
}: ErrorStateProps) {
  const [busy, setBusy] = useState(false);
  const loading = busy || Boolean(retrying);

  const retry = () => {
    if (!onRetry || busy) return;
    setBusy(true);

    let outcome: unknown;
    try {
      outcome = onRetry();
    } catch {
      outcome = undefined; // the retry itself failed: the error is shown again below
    }
    const settled = Promise.resolve(outcome).catch(() => undefined);
    const minimum = new Promise<void>((resolve) => setTimeout(resolve, MINIMUM_LOADER_MS));
    void Promise.all([settled, minimum]).finally(() => setBusy(false));
  };

  return (
    <div
      role={loading ? 'status' : 'alert'}
      aria-busy={loading}
      className="flex flex-col items-center px-4 py-12 text-center"
    >
      {loading ? (
        <span className="flex size-12 items-center justify-center rounded-full bg-info-soft text-primary">
          <LoaderCircle className="size-6 animate-spin" aria-hidden="true" />
        </span>
      ) : (
        <span className="flex size-12 items-center justify-center rounded-full bg-danger-soft text-danger">
          <TriangleAlert className="size-6" aria-hidden="true" />
        </span>
      )}
      <h2 className="mt-4 text-base font-semibold">{loading ? 'Trying again…' : title}</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {loading ? 'Please wait a moment.' : message}
      </p>
      <div className="mt-4 flex gap-2">
        {onRetry && (
          <Button variant="secondary" onClick={retry} loading={loading}>
            Try again
          </Button>
        )}
        {action}
      </div>
    </div>
  );
}
