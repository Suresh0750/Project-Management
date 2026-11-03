import { apiClient } from '@/lib/api/client';
import type { ApiSuccess } from '@/lib/api/types';
import { getTokens } from '@/lib/auth/token-store';


export type AuthTransport = 'cookie' | 'bearer';

export const TRANSPORT_HEADER = 'X-Auth-Transport';

const CACHE_KEY = 'pf.auth.transport';

export function transportHeaders(transport: AuthTransport): Record<string, string> {
  return transport === 'bearer' ? { [TRANSPORT_HEADER]: 'bearer' } : {};
}

/** For calls made while signed in: a stored token pair means this browser is in bearer mode. */
export function currentTransportHeaders(): Record<string, string> {
  return transportHeaders(getTokens() ? 'bearer' : 'cookie');
}

async function probe(): Promise<AuthTransport> {
  try {

    await apiClient.get('/auth/cookie-probe');
    const { data } = await apiClient.get<ApiSuccess<{ cookiesWorking: boolean }>>('/auth/cookie-probe');
    return data.data.cookiesWorking ? 'cookie' : 'bearer';
  } catch {
    // Cannot tell (API unreachable): keep the safe default. Login itself will report the problem.
    return 'cookie';
  }
}

let pending: Promise<AuthTransport> | null = null;

/** Decides once per tab session, then remembers; concurrent callers share one probe. */
export function getTransport(): Promise<AuthTransport> {
  // Build-time override (NEXT_PUBLIC_AUTH_TRANSPORT): "bearer" or "cookie" skips the cookie
  // test and always uses that mode. Anything else (the default) detects it per browser.
  // Referenced statically so Next.js can inline it into the bundle.
  const forced = process.env.NEXT_PUBLIC_AUTH_TRANSPORT;
  if (forced === 'bearer' || forced === 'cookie') return Promise.resolve(forced);

  try {
    const saved = window.sessionStorage.getItem(CACHE_KEY);
    if (saved === 'cookie' || saved === 'bearer') return Promise.resolve(saved);
  } catch {
    // sessionStorage unavailable: just probe each time
  }

  pending ??= probe()
    .then((transport) => {
      try {
        window.sessionStorage.setItem(CACHE_KEY, transport);
      } catch {
        // ignore
      }
      return transport;
    })
    .finally(() => {
      pending = null;
    });
  return pending;
}
