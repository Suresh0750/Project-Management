import type { Role } from '@prisma/client';

export {};

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      user?: AuthUser;
    }
  }
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
}

export interface JwtAccessPayload {
  sub: string;   // userId
  tv: number;    // tokenVersion
  email: string;
  role: Role;
  iat?: number;
  exp?: number;
}

export interface JwtRefreshPayload {
  sub: string;   // userId
  tv: number;    // tokenVersion
  iat?: number;
  exp?: number;
}
