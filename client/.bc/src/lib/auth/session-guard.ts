import { clearTokens } from '@/lib/auth/token-store';
import { disconnectSocket } from '@/lib/socket/client';

export type SessionEndReason = 'deactivated';

let ended = false;

/** True once the session was ended on this page; the API client then refuses to send anything. */
export function isSessionEnded(): boolean {
  return ended;
}

/**
 * Ends the session at once and leaves for the login page. Called by the API client the moment
 * the server says the account is deactivated, so the app makes no further requests:
 * the live connection is closed, new requests are blocked (see client.ts), and a full page
 * navigation discards every cached query so nothing can retry or bounce back.
 */
export function endSession(reason: SessionEndReason): void {
  if (ended || typeof window === 'undefined') return;

  const target = `/login?reason=${reason}`;
  // Already on that exact page: nothing to leave, and nothing to block.
  if (`${window.location.pathname}${window.location.search}` === target) return;

  ended = true;
  clearTokens();
  disconnectSocket();
  window.location.replace(target);
}
