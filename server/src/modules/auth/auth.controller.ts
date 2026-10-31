import type { NextFunction, Request, Response } from 'express';
import { success } from '../../utils/apiResponse.js';
import { clearAuthCookies, setAuthCookies } from '../../utils/cookies.js';
import { HttpError } from '../../utils/httpError.js';
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from '../../constants.js';
import * as authService from './auth.service.js';
import type { LoginInput, RegisterInput } from './auth.validation.js';

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { user, accessToken, refreshToken } = await authService.register(
      req.body as RegisterInput,
    );
    setAuthCookies(res, accessToken, refreshToken);
    res.status(201).json(success({ user }, 'Account created successfully'));
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
    res.status(200).json(success({ user }, 'Login successful'));
  } catch (err) {
    next(err);
  }
}

// Public on purpose: a user whose access token has expired must still be able to log out.
export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await authService.logout(
      req.cookies[ACCESS_TOKEN_COOKIE] as string | undefined,
      req.cookies[REFRESH_TOKEN_COOKIE] as string | undefined,
    );
    clearAuthCookies(res);
    res.status(200).json(success(null, 'Logged out successfully'));
  } catch (err) {
    next(err);
  }
}

export async function refreshTokens(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = req.cookies[REFRESH_TOKEN_COOKIE] as string | undefined;
    if (!token) throw new HttpError(401, 'Refresh token not found');

    const { user, accessToken, refreshToken } = await authService.refresh(token);
    setAuthCookies(res, accessToken, refreshToken);
    res.status(200).json(success({ user }, 'Tokens refreshed successfully'));
  } catch (err) {
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
