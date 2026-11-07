/**
 * Tells the other tabs of this browser when someone signs in or out, using a BroadcastChannel
 * (a browser feature that lets tabs of one site talk to each other). The cookies are shared by all
 * tabs, so without this a tab would keep showing a screen that no longer matches them.
 */

const CHANNEL_NAME = 'projectflow:auth';

type AuthMessageType = 'logout' | 'login';

interface AuthMessage {
  type: AuthMessageType;
  /** Which tab sent it, so a tab can ignore its own message. */
  from: string;
}

const TAB_ID =
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : String(Math.random());

// One long-lived sender: closing a channel straight after posting can drop the message.
let sender: BroadcastChannel | null = null;

function supported(): boolean {
  return typeof BroadcastChannel !== 'undefined';
}

function broadcast(type: AuthMessageType): void {
  if (!supported()) return;
  try {
    sender ??= new BroadcastChannel(CHANNEL_NAME);
    sender.postMessage({ type, from: TAB_ID } satisfies AuthMessage);
  } catch {
    // Best effort: the other tabs will still find out on their next request.
  }
}

function listen(type: AuthMessageType, handler: () => void, ignoreOwn: boolean): () => void {
  if (!supported()) return () => undefined;

  const channel = new BroadcastChannel(CHANNEL_NAME);
  channel.onmessage = (event: MessageEvent<AuthMessage>) => {
    if (event.data?.type !== type) return;
    if (ignoreOwn && event.data.from === TAB_ID) return;
    handler();
  };
  return () => channel.close();
}

export function broadcastLogout(): void {
  broadcast('logout');
}

/** Call after a successful sign-in (login, or the sign-up code that signs the user in). */
export function broadcastLogin(): void {
  broadcast('login');
}

/** Runs `handler` when another tab logs out. Returns a function that stops listening. */
export function onLogoutElsewhere(handler: () => void): () => void {
  return listen('logout', handler, false);
}

/**
 * Runs `handler` when ANOTHER tab signs in (this tab's own sign-in is ignored, so the tab that
 * just logged in is not interrupted). Returns a function that stops listening.
 */
export function onLoginElsewhere(handler: () => void): () => void {
  return listen('login', handler, true);
}
