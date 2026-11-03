
import { TOKEN_STORAGE_KEY } from '@/lib/auth/token-store';

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


export function onLogoutElsewhere(handler: () => void): () => void {
  const channel = supported() ? new BroadcastChannel(CHANNEL_NAME) : null;
  if (channel) {
    channel.onmessage = (event: MessageEvent<AuthMessage>) => {
      if (event.data?.type === 'logout') handler();
    };
  }

  const onStorage = (event: StorageEvent) => {
    if (event.key === TOKEN_STORAGE_KEY && event.oldValue !== null && event.newValue === null) {
      handler();
    }
  };
  window.addEventListener('storage', onStorage);

  return () => {
    channel?.close();
    window.removeEventListener('storage', onStorage);
  };
}
