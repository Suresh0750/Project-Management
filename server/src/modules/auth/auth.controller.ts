import type { NextFunction, Request, Response } from 'express';
import { success } from '../../utils/apiResponse.js';
import { extractBearerToken, tokensIfRequested } from '../../utils/bearer.js';
import { PROBE_COOKIE, clearAuthCookies, setAuthCookies, setProbeCookie } from '../../utils/cookies.js';
import { HttpError } from '../../utils/httpError.js';
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from '../../constants.js';
import * as authService from './auth.service.js';
import { disconnectUserSockets } from '../../realtime/socket.js';
import type {
  ChangePasswordInput,
  LoginInput,
  RegisterInput,
  ResendOtpInput,
  UpdateProfileInput,
  VerifyEmailInput,
} from './auth.validation.js';

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.register(req.body as RegisterInput);
    res
      .status(201)
      .json(success(result, 'Account created. Enter the verification code we emailed you.'));
  } catch (err) {
    next(err);
  }
}

export async function verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { user, accessToken, refreshToken } = await authService.verifyEmail(
      req.body as VerifyEmailInput,
    );
    setAuthCookies(res, accessToken, refreshToken);
    res
      .status(200)
      .json(
        success(
          { user, ...tokensIfRequested(req, { accessToken, refreshToken }) },
          'Email verified successfully',
        ),
      );
  } catch (err) {
    next(err);
  }
}

export async function resendOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.resendOtp((req.body as ResendOtpInput).email);
    res.status(200).json(success(result, 'If the account needs verification, a new code was sent.'));
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { user, accessToken, refreshToken } = await authService.login(
      req.body as LoginInput,
    );
    setAuthCookies(res, accessToken, refreshToken);
    res
      .status(200)
      .json(
        success({ user, ...tokensIfRequested(req, { accessToken, refreshToken }) }, 'Login successful'),
      );
  } catch (err) {
    next(err);
  }
}

// Public on purpose: a user whose access token has expired must still be able to log out.
export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Cookie clients are identified by their cookies, bearer clients by the Authorization header
    // and the refresh token in the body. Either way every session of the user is revoked.
    const userId = await authService.logout(
      extractBearerToken(req) ?? (req.cookies[ACCESS_TOKEN_COOKIE] as string | undefined),
      (req.cookies[REFRESH_TOKEN_COOKIE] as string | undefined) ?? bodyRefreshToken(req),
    );
    clearAuthCookies(res);
    // Every session of this user was just revoked, so end their live connections as well. Other
    // devices then notice at once instead of on their next click.
    if (userId) disconnectUserSockets(userId);
    res.status(200).json(success(null, 'Logged out successfully'));
  } catch (err) {
    next(err);
  }
}

export async function refreshTokens(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = (req.cookies[REFRESH_TOKEN_COOKIE] as string | undefined) ?? bodyRefreshToken(req);
    if (!token) throw new HttpError(401, 'Refresh token not found');

    const { user, accessToken, refreshToken } = await authService.refresh(token);
    setAuthCookies(res, accessToken, refreshToken);
    res
      .status(200)
      .json(
        success(
          { user, ...tokensIfRequested(req, { accessToken, refreshToken }) },
          'Tokens refreshed successfully',
        ),
      );
  } catch (err) {
    // The refresh token is the last credential. If it is invalid, expired, revoked or its owner
    // was deactivated, nothing can renew this session, so remove the cookies as well.
    if (err instanceof HttpError && (err.statusCode === 401 || err.statusCode === 403)) {
      clearAuthCookies(res);
    }
    next(err);
  }
}

export async function me(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // req.user is set by authenticate middleware
    const user = await authService.getMe(req.user!.id);
    res.status(200).json(success({ user }, 'User fetched successfully'));
  } catch (err) {
    next(err);
  }
}

export async function updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await authService.updateProfile(req.user!.id, req.body as UpdateProfileInput);
    res.status(200).json(success({ user }, 'Profile updated successfully'));
  } catch (err) {
    next(err);
  }
}

export async function changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { user, accessToken, refreshToken } = await authService.changePassword(
      req.user!.id,
      req.body as ChangePasswordInput,
    );
    setAuthCookies(res, accessToken, refreshToken);
    // Other devices were just signed out; end their live connections too.
    disconnectUserSockets(user.id);
    // The old tokens were just revoked with the other sessions, so a bearer client must be given
    // the new pair or it would be signed out by its own password change.
    res
      .status(200)
      .json(
        success(
          { user, ...tokensIfRequested(req, { accessToken, refreshToken }) },
          'Password updated successfully',
        ),
      );
  } catch (err) {
    next(err);
  }
}

function bodyRefreshToken(req: Request): string | undefined {
  const body = req.body as { refreshToken?: unknown } | undefined;
  return typeof body?.refreshToken === 'string' ? body.refreshToken : undefined;
}

/**
 * Tells the client whether login cookies work in this browser. The first call sets a probe
 * cookie with the same flags as the login cookies; the second call reports whether it came back.
 */
export function cookieProbe(req: Request, res: Response): void {
  const cookiesWorking = (req.cookies as Record<string, string | undefined>)[PROBE_COOKIE] === '1';
  setProbeCookie(res);
  res.status(200).json(success({ cookiesWorking }, 'Cookie probe'));
}
