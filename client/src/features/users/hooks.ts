'use client';

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import {
  cancelEmailChange,
  confirmEmailChange,
  createUser,
  getUser,
  listUsers,
  resendEmailChangeCode,
  updateUser,
  updateUserStatus,
  type CreateUserPayload,
  type ListUsersParams,
  type UpdateUserPayload,
  type UpdateUserResult,
} from '@/features/users/api';
import type { ApiError } from '@/lib/api/errors';
import type { AuthUser } from '@/types/auth';

export const usersKeys = {
  all: ['users'] as const,
  list: (params: ListUsersParams) => ['users', 'list', params] as const,
  detail: (id: string) => ['users', 'detail', id] as const,
};

export function useUsers(params: ListUsersParams, enabled = true) {
  return useQuery({
    queryKey: usersKeys.list(params),
    queryFn: ({ signal }) => listUsers(params, signal),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useUser(id: string) {
  return useQuery<AuthUser, ApiError>({
    queryKey: usersKeys.detail(id),
    queryFn: ({ signal }) => getUser(id, signal),
  });
}

function syncUser(queryClient: QueryClient, user: AuthUser) {
  // Merge, so details only the detail endpoint returns (pending email change, role lock) survive
  // responses that do not repeat them (e.g. activate/deactivate).
  queryClient.setQueryData<AuthUser>(usersKeys.detail(user.id), (current) => ({ ...current, ...user }));
  void queryClient.invalidateQueries({ queryKey: [...usersKeys.all, 'list'] });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation<AuthUser, ApiError, CreateUserPayload>({
    mutationFn: createUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: usersKeys.all }),
  });
}

export function useUpdateUser(id: string) {
  const queryClient = useQueryClient();
  return useMutation<UpdateUserResult, ApiError, UpdateUserPayload>({
    mutationFn: (payload) => updateUser(id, payload),
    onSuccess: ({ user }) => syncUser(queryClient, user),
  });
}

export function useConfirmEmailChange(id: string) {
  const queryClient = useQueryClient();
  return useMutation<AuthUser, ApiError, string>({
    mutationFn: (otp) => confirmEmailChange(id, otp),
    onSuccess: (user) => syncUser(queryClient, user),
  });
}

export function useResendEmailChangeCode(id: string) {
  return useMutation<{ newEmail: string; resendAfterSeconds: number }, ApiError, void>({
    mutationFn: () => resendEmailChangeCode(id),
  });
}

export function useCancelEmailChange(id: string) {
  const queryClient = useQueryClient();
  return useMutation<void, ApiError, void>({
    mutationFn: () => cancelEmailChange(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: usersKeys.detail(id) }),
  });
}

export function useUpdateUserStatus() {
  const queryClient = useQueryClient();
  return useMutation<AuthUser, ApiError, { id: string; isActive: boolean }>({
    mutationFn: ({ id, isActive }) => updateUserStatus(id, isActive),
    onSuccess: (user) => syncUser(queryClient, user),
  });
}
