import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../../prisma/client.js';
import { HttpError } from '../utils/httpError.js';
import { verifyAccessToken } from '../utils/jwt.js';
import { ACCESS_TOKEN_COOKIE } from '../constants.js';

export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const cookieToken = req.cookies[ACCESS_TOKEN_COOKIE] as string | undefined;
    const headerToken = extractBearerToken(req);
    const token = cookieToken ?? headerToken;

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

    if (!user) throw new HttpError(401, 'User not found');
    if (!user.isActive) throw new HttpError(403, 'Account is deactivated');
    if (!user.emailVerifiedAt) throw new HttpError(403, 'Email address is not verified');
    if (payload.tv !== user.tokenVersion) throw new HttpError(401, 'Session has been revoked');

    const { tokenVersion: _tokenVersion, emailVerifiedAt: _emailVerifiedAt, ...authUser } = user;
    req.user = authUser;
    next();
  } catch (err) {
    next(err);
  }
}

function extractBearerToken(req: Request): string | undefined {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return undefined;
  return authHeader.slice(7);
}
