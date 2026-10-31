'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { forgotPassword, getMe, login, logout, resetPassword } from '@/features/auth/api';
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
