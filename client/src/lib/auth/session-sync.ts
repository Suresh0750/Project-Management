
const CHANNEL_NAME = 'projectflow:auth';

interface AuthMessage {
  type: 'logout';
}

// One long-lived sender: closing a channel straight after posting can drop the message.
let sender: BroadcastChannel | null = null;

function supported(): boolean {
  return typeof BroadcastChannel !== 'undefined';
}

export function broadcastLogout(): void {
  if (!supported()) return;
  try {
    sender ??= new BroadcastChannel(CHANNEL_NAME);
    sender.postMessage({ type: 'logout' } satisfies AuthMessage);
  } catch {
    // Best effort: the other tabs will still find out on their next request.
  }
}

/** Runs `handler` when another tab logs out. Returns a function that stops listening. */
export function onLogoutElsewhere(handler: () => void): () => void {
  if (!supported()) return () => undefined;

  const channel = new BroadcastChannel(CHANNEL_NAME);
  channel.onmessage = (event: MessageEvent<AuthMessage>) => {
    if (event.data?.type === 'logout') handler();
  };
  return () => channel.close();
}
