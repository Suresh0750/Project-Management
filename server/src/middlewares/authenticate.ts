import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../../prisma/client.js';
import { accountDeactivated } from '../utils/accountErrors.js';
import { extractBearerToken } from '../utils/bearer.js';
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
    // An explicit Authorization header wins: a client that sends one is deliberately using bearer
    // tokens, and a stale cookie left over from an earlier session must not override it.
    const cookieToken = req.cookies[ACCESS_TOKEN_COOKIE] as string | undefined;
    const token = extractBearerToken(req) ?? cookieToken;

    if (!token) throw new HttpError(401, 'Authentication required');

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      throw new HttpError(401, 'Invalid or expired access token');
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        emailVerifiedAt: true,
        tokenVersion: true,
      },
    });

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
