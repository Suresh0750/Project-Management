import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env.js';
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from '../constants.js';
import { HttpError } from '../utils/httpError.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);


export function csrfProtection(req: Request, _res: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }

  const cookies = req.cookies as Record<string, string | undefined>;
  const hasAuthCookie = Boolean(cookies[ACCESS_TOKEN_COOKIE] ?? cookies[REFRESH_TOKEN_COOKIE]);
  if (!hasAuthCookie) {
    next();
    return;
  }

  const origin = req.header('origin') ?? originFromReferer(req.header('referer'));
  if (origin !== new URL(env.CLIENT_URL).origin) {
    next(new HttpError(403, 'Cross-site request blocked'));
    return;
  }

  next();
}

function originFromReferer(referer: string | undefined): string | undefined {
  if (!referer) return undefined;
  try {
    return new URL(referer).origin;
  } catch {
    return undefined;
  }
}
