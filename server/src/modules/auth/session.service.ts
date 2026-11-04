import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { Role } from '@prisma/client';
import { prisma } from '../../../prisma/client.js';
import { HttpError } from '../../utils/httpError.js';
import { signAccessToken, signRefreshToken } from '../../utils/jwt.js';

/**
 * One Session row per signed-in browser/device. Both tokens carry its id (`sid`), so logging out
 * on one device deletes only that row and leaves the user's other devices signed in.
 * Signing a user out everywhere (password change, deactivation) deletes all of their rows.
 */

interface TokenSubject {
  id: string;
  email: string;
  role: Role;
}

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
}

function sign(user: TokenSubject, sessionId: string): IssuedTokens & { expiresAt: Date } {
  const refreshToken = signRefreshToken(user.id, sessionId);
  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role,
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
  // updateMany: if the session was deleted a moment ago (logout, password change), refuse
  // instead of failing with a database error.
  const { count } = await prisma.session.updateMany({
    where: { id: sessionId },
    data: { expiresAt, lastUsedAt: new Date() },
  });
  if (count === 0) throw new HttpError(401, 'Session has been revoked');
  return tokens;
}

/** Logout on one device. */
export async function endSession(sessionId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { id: sessionId } });
}

/**
 * Ends every session of a user but keeps the rows, tagged with the reason, so the next request
 * from any of their devices can be answered with an explanation. The rows expire normally.
 */
export async function markSessionsEnded(userId: string, reason: string): Promise<void> {
  await prisma.session.updateMany({ where: { userId }, data: { endedReason: reason } });
}

/** Sign out everywhere: password change, deactivation. */
export async function endAllSessions(userId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { userId } });
}

export async function deleteExpiredSessions(now: Date = new Date()): Promise<number> {
  const result = await prisma.session.deleteMany({ where: { expiresAt: { lt: now } } });
  return result.count;
}
