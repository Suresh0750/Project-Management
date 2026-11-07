'use client';

import { useEffect } from 'react';
import { onLoginElsewhere } from '@/lib/auth/session-sync';

/**
 * For pages that only make sense when nobody is signed in (login, register, forgot password,
 * verify email, reset password). If another tab of this browser signs in, this tab is no longer
 * a visitor page: reload its address without the query, and the server-side route guard
 * (proxy.ts) sends the person to their own dashboard.
 */
export function useLeaveOnLoginElsewhere(): void {
  useEffect(
    () =>
      onLoginElsewhere(() => {
        window.location.replace(window.location.pathname);
      }),
    [],
  );
}
