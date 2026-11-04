import jwt from 'jsonwebtoken';
import type { StringValue } from 'ms';
import type { Role } from '@prisma/client';
import { env } from '../config/env.js';
import type { JwtAccessPayload, JwtRefreshPayload } from '../types/express.js';

export function signAccessToken(payload: {
  sub: string;
  email: string;
  role: Role;
  sessionId: string;
}): string {
  const options: jwt.SignOptions = {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as StringValue,
  };
  return jwt.sign(
    { sub: payload.sub, sid: payload.sessionId, email: payload.email, role: payload.role },
    env.JWT_ACCESS_SECRET,
    options,
  );
}

export function signRefreshToken(sub: string, sessionId: string): string {
  const options: jwt.SignOptions = {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as StringValue,
  };
  return jwt.sign({ sub, sid: sessionId }, env.JWT_REFRESH_SECRET, options);
}

// Verify token

export function verifyAccessToken(token: string): JwtAccessPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtAccessPayload;
}

export function verifyRefreshToken(token: string): JwtRefreshPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtRefreshPayload;
}
