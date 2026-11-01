'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  changePassword,
  forgotPassword,
  getMe,
  login,
  logout,
  registerAccount,
  resendOtp,
  resetPassword,
  updateProfile,
  verifyEmail,
  type OtpSent,
  type UpdateProfilePayload,
} from '@/features/auth/api';
import type { ApiError } from '@/lib/api/errors';
import type { AuthUser } from '@/types/auth';
import type { LoginValues } from '@/schemas/auth';

export const SESSION_QUERY_KEY = ['auth', 'me'] as const;

export function useSession() {
  return useQuery<AuthUser, ApiError>({
    queryKey: SESSION_QUERY_KEY,
    queryFn: ({ signal }) => getMe(signal),
    retry: false,
    staleTime: 60_000,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation<AuthUser, ApiError, LoginValues>({
    mutationFn: (values) => login(values),
    onSuccess: (user) => {
      queryClient.setQueryData(SESSION_QUERY_KEY, user);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError>({
    mutationFn: logout,
    onSettled: () => {
      queryClient.clear();
    },
  });
}

export function useForgotPassword() {
  return useMutation<void, ApiError, string>({ mutationFn: forgotPassword });
}

export function useResetPassword() {
  return useMutation<void, ApiError, { token: string; password: string }>({
    mutationFn: ({ token, password }) => resetPassword(token, password),
  });
}

/** Keep the signed-in user in the session cache so the name updates everywhere at once. */
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation<AuthUser, ApiError, UpdateProfilePayload>({
    mutationFn: updateProfile,
    onSuccess: (user) => queryClient.setQueryData(SESSION_QUERY_KEY, user),
  });
}

export function useChangePassword() {
  const queryClient = useQueryClient();
  return useMutation<AuthUser, ApiError, { currentPassword: string; newPassword: string }>({
    mutationFn: changePassword,
    onSuccess: (user) => queryClient.setQueryData(SESSION_QUERY_KEY, user),
  });
}

export function useRegister() {
  return useMutation<OtpSent, ApiError, { name: string; email: string; password: string }>({
    mutationFn: registerAccount,
  });
}

/** Verifying the code also signs the user in, so the session cache is filled with the result. */
export function useVerifyEmail() {
  const queryClient = useQueryClient();
  return useMutation<AuthUser, ApiError, { email: string; otp: string }>({
    mutationFn: verifyEmail,
    onSuccess: (user) => queryClient.setQueryData(SESSION_QUERY_KEY, user),
  });
}

export function useResendOtp() {
  return useMutation<{ resendAfterSeconds: number }, ApiError, string>({ mutationFn: resendOtp });
}
