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
      transports: ['websocket', 'polling'],
    });
  }

  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
}
