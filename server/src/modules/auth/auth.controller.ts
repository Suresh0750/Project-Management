import type { NextFunction, Request, Response } from 'express';
import { success } from '../../utils/apiResponse.js';
import { clearAuthCookies, setAuthCookies } from '../../utils/cookies.js';
import { HttpError } from '../../utils/httpError.js';
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from '../../constants.js';
import { extractBearerToken } from '../../middlewares/authenticate.js';
import * as authService from './auth.service.js';
import { disconnectSessionSockets, disconnectUserSockets } from '../../realtime/socket.js';
import type {
  ChangePasswordInput,
  LoginInput,
  RegisterInput,
  ResendOtpInput,
  UpdateProfileInput,
  VerifyEmailInput,
} from './auth.validation.js';

// Tokens also travel in the response body (cookies are still set) so the client can send them
// as Authorization: Bearer on every request.
function tokensBody(accessToken: string, refreshToken: string) {
  return { accessToken, refreshToken };
}

function bodyString(req: Request, key: string): string | undefined {
  const value = (req.body as Record<string, unknown> | undefined)?.[key];
  return typeof value === 'string' && value ? value : undefined;
}

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
      req.get('user-agent'),
    );
    setAuthCookies(res, accessToken, refreshToken);
    res.status(200).json(success({ user, tokens: tokensBody(accessToken, refreshToken) }, 'Email verified successfully'));
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
      req.get('user-agent'),
    );
    setAuthCookies(res, accessToken, refreshToken);
    res.status(200).json(success({ user, tokens: tokensBody(accessToken, refreshToken) }, 'Login successful'));
  } catch (err) {
    next(err);
  }
}

// Public on purpose: a user whose access token has expired must still be able to log out.
export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const ended = await authService.logout(
      extractBearerToken(req) ?? (req.cookies[ACCESS_TOKEN_COOKIE] as string | undefined),
      (req.cookies[REFRESH_TOKEN_COOKIE] as string | undefined) ?? bodyString(req, 'refreshToken'),
    );
    clearAuthCookies(res);
    // Only this device's session ended: close its live connections, leave the user's other
    // devices connected.
    if (ended) disconnectSessionSockets(ended.sessionId);
    res.status(200).json(success(null, 'Logged out successfully'));
  } catch (err) {
    next(err);
  }
}

export async function refreshTokens(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token =
      (req.cookies[REFRESH_TOKEN_COOKIE] as string | undefined) ?? bodyString(req, 'refreshToken');
    if (!token) throw new HttpError(401, 'Refresh token not found');

    const { user, accessToken, refreshToken } = await authService.refresh(token);
    setAuthCookies(res, accessToken, refreshToken);
    res.status(200).json(success({ user, tokens: tokensBody(accessToken, refreshToken) }, 'Tokens refreshed successfully'));
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
      req.get('user-agent'),
    );
    setAuthCookies(res, accessToken, refreshToken);
    // Other devices were just signed out; end their live connections too.
    disconnectUserSockets(user.id);
    res.status(200).json(success({ user, tokens: tokensBody(accessToken, refreshToken) }, 'Password updated successfully'));
  } catch (err) {
    next(err);
  }
}
