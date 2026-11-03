import { clearTokens } from '@/lib/auth/token-store';
import { disconnectSocket } from '@/lib/socket/client';

export type SessionEndReason = 'deactivated';

let ended = false;

/** True once the session was ended on this page; the API client then refuses to send anything. */
export function isSessionEnded(): boolean {
  return ended;
}

export function endSession(reason: SessionEndReason): void {
  if (ended || typeof window === 'undefined') return;

  const target = `/login?reason=${reason}`;
  if (`${window.location.pathname}${window.location.search}` === target) return;

  ended = true;
  clearTokens(); 
  disconnectSocket();
  window.location.replace(target);
}
