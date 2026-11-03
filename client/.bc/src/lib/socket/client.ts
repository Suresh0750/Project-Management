import { io, type Socket } from 'socket.io-client';
import { publicEnv } from '@/lib/env';
import { getTokens } from '@/lib/auth/token-store';

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
      // Read on every (re)connect, so a refreshed token is used automatically.
      auth: (send) => send({ token: getTokens()?.accessToken ?? null }),
      transports: ['websocket', 'polling'],
    });
  }

  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
}
