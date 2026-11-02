import type { Request, Response } from 'express';
import { env } from '../config/env.js';
import {
  ACCESS_COOKIE_MAX_AGE_MS,
  ACCESS_TOKEN_COOKIE,
  REFRESH_COOKIE_MAX_AGE_MS,
  REFRESH_TOKEN_COOKIE,
} from '../constants.js';

const isProd = env.NODE_ENV === 'production';
const sameSite = env.COOKIE_SAME_SITE;
const secure = isProd || sameSite === 'none';

let warnedCrossSite = false;


function warnIfCookiesWillBeDropped(req: Request | undefined): void {
  if (warnedCrossSite || !req || sameSite === 'none') return;
  if (req.header('sec-fetch-site') !== 'cross-site') return;

  warnedCrossSite = true;
  console.warn(
    `[cookies] Login came from ${req.header('origin') ?? 'another site'} (cross-site) but ` +
      `COOKIE_SAME_SITE=${sameSite}, so browsers will drop the auth cookies. Serve the API on the ` +
      'same site as the app (reverse proxy), or set COOKIE_SAME_SITE=none (HTTPS only).',
  );
}

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
  warnIfCookiesWillBeDropped(res.req);

  res.cookie(ACCESS_TOKEN_COOKIE, accessToken, {
    httpOnly: true,
    secure,
    sameSite,
    maxAge: ACCESS_COOKIE_MAX_AGE_MS,
    path: '/',
  });

  res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
    httpOnly: true,
    secure,
    sameSite,
    maxAge: REFRESH_COOKIE_MAX_AGE_MS,
    path: '/api/auth',   // restrict refresh token to auth routes only
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_TOKEN_COOKIE, { path: '/' });
  res.clearCookie(REFRESH_TOKEN_COOKIE, { path: '/api/auth' });
}
