import { apiClient } from '@/lib/api/client';
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
  await apiClient.post('/auth/logout');
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
  const { data } = await apiClient.patch<ApiSuccess<AuthUserPayload>>('/auth/password', payload);
  return data.data.user;
}
