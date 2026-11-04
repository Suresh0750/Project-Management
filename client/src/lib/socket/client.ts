import { io, type Socket } from 'socket.io-client';
import { publicEnv } from '@/lib/env';

let socket: Socket | null = null;

/**
 * One shared connection. Authentication rides on the HttpOnly session cookie; the server
 * decides which rooms the socket joins, so there is nothing sensitive to send from here.
 */
export function getSocket(): Socket {
  if (!socket) {
    socket = io(publicEnv.socketUrl, {
      autoConnect: false,
      withCredentials: true,
      // Asked for on every (re)connect, so a refreshed token is used automatically. The token
      // comes from the app's own server (it reads the HttpOnly cookie) and is never stored.
      auth: (send) => {
        void fetch('/api/realtime-token', { cache: 'no-store' })
          .then((response) => (response.ok ? response.json() : null))
          .then((body: { data?: { token?: string } } | null) =>
            send({ token: body?.data?.token ?? null }),
          )
          .catch(() => send({ token: null }));
      },
      transports: ['websocket', 'polling'],
    });
  }

  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
}
