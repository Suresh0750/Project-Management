import { io, type Socket } from 'socket.io-client';
import { publicEnv } from '@/lib/env';

let socket: Socket | null = null;

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
