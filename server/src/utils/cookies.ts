import type { Response } from 'express';
import { env } from '../config/env.js';
import {
  ACCESS_COOKIE_MAX_AGE_MS,
  ACCESS_TOKEN_COOKIE,
  REFRESH_COOKIE_MAX_AGE_MS,
  REFRESH_TOKEN_COOKIE,
} from '../constants.js';

const isProd = env.NODE_ENV === 'production';
const sameSite = env.COOKIE_SAME_SITE;
// Browsers reject SameSite=None cookies unless they are Secure
const secure = isProd || sameSite === 'none';

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
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
