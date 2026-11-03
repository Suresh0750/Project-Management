import { apiClient } from '@/lib/api/client';
import type { ApiSuccess } from '@/lib/api/types';
import type { AuthUser, AuthUserPayload } from '@/types/auth';
import { clearTokens, getTokens, setTokens } from '@/lib/auth/token-store';
import { currentTransportHeaders, getTransport, transportHeaders } from '@/lib/auth/transport';
import type { LoginValues } from '@/schemas/auth';

function applySession(payload: AuthUserPayload): AuthUser {
  if (payload.tokens) setTokens(payload.tokens);
  else clearTokens();
  return payload.user;
}

export async function login(values: LoginValues, signal?: AbortSignal): Promise<AuthUser> {
  // Cookie mode unless this browser turned out not to keep cookies (decided once per tab).
  const transport = await getTransport();
  const { data } = await apiClient.post<ApiSuccess<AuthUserPayload>>('/auth/login', values, {
    signal,
    headers: transportHeaders(transport),
  });
  return applySession(data.data);
}

export async function getMe(signal?: AbortSignal): Promise<AuthUser> {
  const { data } = await apiClient.get<ApiSuccess<AuthUserPayload>>('/auth/me', { signal });
  return data.data.user;
}

export async function logout(): Promise<void> {
  const tokens = getTokens();
  try {
    // Bearer mode has no cookie for the server to read, so it also gets the refresh token.
    await apiClient.post('/auth/logout', tokens ? { refreshToken: tokens.refreshToken } : undefined);
  } finally {
    // Always erase local credentials, even if the request failed: the user asked to leave.
    clearTokens();
  }
}

// NOTE: the server does not expose these two endpoints yet (reported after Phase 1).
export async function forgotPassword(email: string): Promise<void> {
  await apiClient.post('/auth/forgot-password', { email });
}

export async function resetPassword(token: string, password: string): Promise<void> {
  await apiClient.post('/auth/reset-password', { token, password });
}

export interface UpdateProfilePayload {
  name?: string;
  email?: string;
  currentPassword?: string;
}

export async function updateProfile(payload: UpdateProfilePayload): Promise<AuthUser> {
  const { data } = await apiClient.patch<ApiSuccess<AuthUserPayload>>('/auth/profile', payload);
  return data.data.user;
}

export async function changePassword(payload: {
  currentPassword: string;
  newPassword: string;
}): Promise<AuthUser> {
  // The server revokes the old tokens with the other sessions; a bearer client is handed a new pair.
  const { data } = await apiClient.patch<ApiSuccess<AuthUserPayload>>('/auth/password', payload, {
    headers: currentTransportHeaders(),
  });
  return applySession(data.data);
}

export interface OtpSent {
  email: string;
  resendAfterSeconds: number;
}

export async function registerAccount(values: {
  name: string;
  email: string;
  password: string;
}): Promise<OtpSent> {
  const { data } = await apiClient.post<ApiSuccess<OtpSent>>('/auth/register', values);
  return data.data;
}

export async function verifyEmail(values: { email: string; otp: string }): Promise<AuthUser> {
  const transport = await getTransport();
  const { data } = await apiClient.post<ApiSuccess<AuthUserPayload>>('/auth/verify-email', values, {
    headers: transportHeaders(transport),
  });
  return applySession(data.data);
}

export async function resendOtp(email: string): Promise<{ resendAfterSeconds: number }> {
  const { data } = await apiClient.post<ApiSuccess<{ resendAfterSeconds: number }>>(
    '/auth/resend-otp',
    { email },
  );
  return data.data;
}
