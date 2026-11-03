import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { Role } from '@prisma/client';
import { prisma } from '../../../prisma/client.js';
import { signAccessToken, signRefreshToken } from '../../utils/jwt.js';

/**
 * One Session row per signed-in browser/device. Both tokens carry its id (`sid`), so logging out
 * on one device deletes only that row and leaves the user's other devices signed in.
 * `User.tokenVersion` stays as the "sign out everywhere" switch (password change, deactivation).
 */

interface TokenSubject {
  id: string;
  email: string;
  role: Role;
  tokenVersion: number;
}

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
}

function sign(user: TokenSubject, sessionId: string): IssuedTokens & { expiresAt: Date } {
  const refreshToken = signRefreshToken(user.id, user.tokenVersion, sessionId);
  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    tokenVersion: user.tokenVersion,
    sessionId,
  });
  // The row expires exactly when its refresh token does.
  const exp = (jwt.decode(refreshToken) as { exp: number }).exp;
  return { accessToken, refreshToken, expiresAt: new Date(exp * 1000) };
}

/** A new login on this device: creates the session row and the first token pair. */
export async function startSession(user: TokenSubject, userAgent?: string): Promise<IssuedTokens> {
  const id = randomUUID();
  const { expiresAt, ...tokens } = sign(user, id);
  await prisma.session.create({
    data: { id, userId: user.id, userAgent: userAgent?.slice(0, 255) ?? null, expiresAt },
  });
  return tokens;
}

/** Refresh: rotates the token pair of an existing session and pushes its expiry forward. */
export async function renewSession(user: TokenSubject, sessionId: string): Promise<IssuedTokens> {
  const { expiresAt, ...tokens } = sign(user, sessionId);
  await prisma.session.update({
    where: { id: sessionId },
    data: { expiresAt, lastUsedAt: new Date() },
  });
  return tokens;
}

/** Logout on one device. */
export async function endSession(sessionId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { id: sessionId } });
}

/** Sign out everywhere (used together with a tokenVersion bump). */
export async function endAllSessions(userId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { userId } });
}

export async function deleteExpiredSessions(now: Date = new Date()): Promise<number> {
  const result = await prisma.session.deleteMany({ where: { expiresAt: { lt: now } } });
  return result.count;
}
