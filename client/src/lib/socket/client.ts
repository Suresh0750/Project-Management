import { io, type Socket } from 'socket.io-client';
import { getTokens } from '@/lib/auth/token-store';
import { publicEnv } from '@/lib/env';

let socket: Socket | null = null;


export function getSocket(): Socket {
  if (!socket) {
    socket = io(publicEnv.socketUrl, {
      autoConnect: false,
      withCredentials: true,
      transports: ['websocket', 'polling'],
      auth: (send) => send({ token: getTokens()?.accessToken ?? null }),
    });
  }

  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
}
