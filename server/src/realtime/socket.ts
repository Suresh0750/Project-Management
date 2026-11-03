import type { Server as HttpServer } from 'node:http';
import { Role } from '@prisma/client';
import { Server, type Socket } from 'socket.io';
import { prisma } from '../../prisma/client.js';
import { env } from '../config/env.js';
import { ACCESS_TOKEN_COOKIE } from '../constants.js';
import { verifyAccessToken } from '../utils/jwt.js';

interface SocketUser {
  id: string;
  role: Role;
}

let io: Server | null = null;

const userRoom = (userId: string) => `user:${userId}`;
const projectRoom = (projectId: string) => `project:${projectId}`;
const ADMIN_ROOM = 'role:ADMIN';

function readCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0) continue;
    if (part.slice(0, separator).trim() === name) {
      try {
        return decodeURIComponent(part.slice(separator + 1).trim());
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}

/**
 * Same checks as the REST `authenticate` middleware: valid signature, live active user,
 * and an unrevoked token version. The user comes from the database, never the client.
 */
async function authenticateSocket(socket: Socket, next: (error?: Error) => void): Promise<void> {
  try {
    // Browsers always send Origin on WebSocket handshakes; reject cross-site pages that try
    // to ride the user's cookies.
    const origin = socket.handshake.headers.origin;
    if (origin && origin !== new URL(env.CLIENT_URL).origin) {
      next(new Error('forbidden'));
      return;
    }

    const token = readCookie(socket.handshake.headers.cookie, ACCESS_TOKEN_COOKIE);
    if (!token) {
      next(new Error('unauthorized'));
      return;
    }

    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, role: true, isActive: true, tokenVersion: true },
    });
    if (!user || !user.isActive || user.tokenVersion !== payload.tv) {
      next(new Error('unauthorized'));
      return;
    }

    socket.data.user = { id: user.id, role: user.role } satisfies SocketUser;
    socket.data.expiresAtMs = (payload.exp ?? 0) * 1000;
    next();
  } catch {
    next(new Error('unauthorized'));
  }
}

async function projectIdsFor(user: SocketUser): Promise<string[]> {
  if (user.role === Role.ADMIN) return [];
  if (user.role === Role.PROJECT_MANAGER) {
    const projects = await prisma.project.findMany({
      where: { managerId: user.id },
      select: { id: true },
    });
    return projects.map((project) => project.id);
  }
  const memberships = await prisma.projectMember.findMany({
    where: { userId: user.id },
    select: { projectId: true },
  });
  return memberships.map((membership) => membership.projectId);
}

async function onConnection(socket: Socket): Promise<void> {
  const user = socket.data.user as SocketUser;

  // Rooms are decided here from the database. The client can never ask to join one.
  await socket.join(userRoom(user.id));
  if (user.role === Role.ADMIN) await socket.join(ADMIN_ROOM);
  for (const projectId of await projectIdsFor(user)) await socket.join(projectRoom(projectId));

  // The access token is only checked at connect time, so end the connection when it expires.
  // The client refreshes its session and reconnects with a fresh token.
  const remaining = (socket.data.expiresAtMs as number) - Date.now();
  const timer = setTimeout(() => socket.disconnect(true), Math.max(remaining, 0) + 1000);
  timer.unref();
  socket.on('disconnect', () => clearTimeout(timer));
}

export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: { origin: env.CLIENT_URL, credentials: true },
  });
  io.use((socket, next) => {
    void authenticateSocket(socket, next);
  });
  io.on('connection', (socket) => {
    onConnection(socket).catch((error: unknown) => {
      console.error('Socket connection setup failed', error);
      socket.disconnect(true);
    });
  });
  return io;
}

export async function closeSocket(): Promise<void> {
  if (io) await io.close();
  io = null;
}

// ─── Publishing (no-ops when the socket server is not running) ────────────────
export function emitToUser(userId: string, event: string, payload: unknown): void {
  io?.to(userRoom(userId)).emit(event, payload);
}

export function emitToProject(projectId: string, event: string, payload: unknown): void {
  io?.to(projectRoom(projectId)).to(ADMIN_ROOM).emit(event, payload);
}

export function joinProjectRoom(userId: string, projectId: string): void {
  io?.in(userRoom(userId)).socketsJoin(projectRoom(projectId));
}

export function leaveProjectRoom(userId: string, projectId: string): void {
  io?.in(userRoom(userId)).socketsLeave(projectRoom(projectId));
}

/** Ends every live connection of a user (e.g. after their sessions were revoked). */
export function disconnectUserSockets(userId: string): void {
  io?.in(userRoom(userId)).disconnectSockets(true);
}
