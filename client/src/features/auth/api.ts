import { apiClient } from '@/lib/api/client';
import { clearTokens, getTokens } from '@/lib/auth/token-store';
import type { ApiSuccess } from '@/lib/api/types';
import type { AuthUser, AuthUserPayload } from '@/types/auth';
import type { LoginValues } from '@/schemas/auth';

export async function login(values: LoginValues, signal?: AbortSignal): Promise<AuthUser> {
  const { data } = await apiClient.post<ApiSuccess<AuthUserPayload>>('/auth/login', values, {
    signal,
  });
  return data.data.user;
}

export async function getMe(signal?: AbortSignal): Promise<AuthUser> {
  const { data } = await apiClient.get<ApiSuccess<AuthUserPayload>>('/auth/me', { signal });
  return data.data.user;
}

export async function logout(): Promise<void> {
  const refreshToken = getTokens()?.refreshToken;
  try {
    await apiClient.post('/auth/logout', { refreshToken });
  } finally {
    // Whatever the server said, this browser no longer holds a session.
    clearTokens();
  }
}

/** Emails a one-time code (if the account exists; the answer is always the same). */
export async function forgotPassword(email: string): Promise<{ resendAfterSeconds: number }> {
  const { data } = await apiClient.post<ApiSuccess<{ resendAfterSeconds: number }>>(
    '/auth/forgot-password',
    { email },
  );
  return data.data;
}

export async function resetPassword(values: {
  email: string;
  otp: string;
  password: string;
}): Promise<void> {
  await apiClient.post('/auth/reset-password', {
    email: values.email,
    otp: values.otp,
    newPassword: values.password,
  });
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
  const { data } = await apiClient.patch<ApiSuccess<AuthUserPayload>>('/auth/password', payload);
  return data.data.user;
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
  const { data } = await apiClient.post<ApiSuccess<AuthUserPayload>>('/auth/verify-email', values);
  return data.data.user;
}

export async function resendOtp(email: string): Promise<{ resendAfterSeconds: number }> {
  const { data } = await apiClient.post<ApiSuccess<{ resendAfterSeconds: number }>>(
    '/auth/resend-otp',
    { email },
  );
  return data.data;
}
