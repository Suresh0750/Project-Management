import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../../prisma/client.js';
import { accountDeactivated } from '../utils/accountErrors.js';
import { clearAuthCookies } from '../utils/cookies.js';
import { HttpError } from '../utils/httpError.js';
import { verifyAccessToken } from '../utils/jwt.js';
import { ACCESS_TOKEN_COOKIE } from '../constants.js';

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  // A rejection that means the session is over for good (not just an expired access token, which
  // the refresh cookie can still renew) also removes the cookies, so the browser stops sending
  // dead credentials on every request.
  const sessionOver = (error: HttpError): HttpError => {
    clearAuthCookies(res);
    return error;
  };

  try {
    // The client sends the bearer header on every request; the cookie covers older sessions.
    const token =
      extractBearerToken(req) ?? (req.cookies[ACCESS_TOKEN_COOKIE] as string | undefined);

    if (!token) throw new HttpError(401, 'Authentication required');

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      throw new HttpError(401, 'Invalid or expired access token');
    }

    const session = payload.sid
      ? await prisma.session.findUnique({
          where: { id: payload.sid },
          select: {
            userId: true,
            expiresAt: true,
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                role: true,
                isActive: true,
                emailVerifiedAt: true,
                tokenVersion: true,
              },
            },
          },
        })
      : null;
    if (!session || session.userId !== payload.sub || session.expiresAt <= new Date()) {
      throw sessionOver(new HttpError(401, 'Session has been revoked'));
    }
    const user = session.user;

    if (!user) throw sessionOver(new HttpError(401, 'User not found'));
    if (!user.isActive) throw sessionOver(accountDeactivated());
    if (!user.emailVerifiedAt) throw new HttpError(403, 'Email address is not verified');
    if (payload.tv !== user.tokenVersion) {
      throw sessionOver(new HttpError(401, 'Session has been revoked'));
    }

    const { tokenVersion: _tokenVersion, emailVerifiedAt: _emailVerifiedAt, ...authUser } = user;
    req.user = authUser;
    next();
  } catch (err) {
    next(err);
  }
}

export function extractBearerToken(req: Request): string | undefined {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return undefined;
  return authHeader.slice(7);
}
