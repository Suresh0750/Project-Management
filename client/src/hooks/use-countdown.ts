'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Whole seconds remaining until a deadline, ticking while it runs. Pass `initialSeconds` to
 * start immediately (e.g. a code was just sent), or call `start(seconds)` later.
 */
export function useCountdown(initialSeconds = 0) {
  const [endsAt, setEndsAt] = useState<number | null>(() =>
    initialSeconds > 0 ? Date.now() + initialSeconds * 1000 : null,
  );
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (endsAt === null) return;
    const timer = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(timer);
  }, [endsAt]);

  const start = useCallback((seconds: number) => {
    const current = Date.now();
    setNow(current);
    setEndsAt(current + seconds * 1000);
  }, []);

  const remaining = endsAt === null ? 0 : Math.max(0, Math.ceil((endsAt - now) / 1000));
  return { remaining, start };
}
