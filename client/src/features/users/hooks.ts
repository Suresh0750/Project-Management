'use client';

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import {
  createUser,
  getUser,
  listUsers,
  updateUser,
  updateUserStatus,
  type CreateUserPayload,
  type ListUsersParams,
  type UpdateUserPayload,
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
  queryClient.setQueryData(usersKeys.detail(user.id), user);
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
  return useMutation<AuthUser, ApiError, UpdateUserPayload>({
    mutationFn: (payload) => updateUser(id, payload),
    onSuccess: (user) => syncUser(queryClient, user),
  });
}

export function useUpdateUserStatus() {
  const queryClient = useQueryClient();
  return useMutation<AuthUser, ApiError, { id: string; isActive: boolean }>({
    mutationFn: ({ id, isActive }) => updateUserStatus(id, isActive),
    onSuccess: (user) => syncUser(queryClient, user),
  });
}
