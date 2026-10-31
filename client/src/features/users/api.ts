import { apiClient } from '@/lib/api/client';
import { isPaginationMeta, type ApiSuccess, type Paginated } from '@/lib/api/types';
import type { AuthUser, Role } from '@/types/auth';
import type { AssignableRole } from '@/schemas/user';

export interface ListUsersParams {
  page: number;
  limit: number;
  search?: string;
  role?: Role;
  isActive?: boolean;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  role: AssignableRole;
}

export interface UpdateUserPayload {
  name?: string;
  email?: string;
  role?: AssignableRole;
}

interface UserPayload {
  user: AuthUser;
}

export async function listUsers(
  params: ListUsersParams,
  signal?: AbortSignal,
): Promise<Paginated<AuthUser>> {
  const { data } = await apiClient.get<ApiSuccess<AuthUser[]>>('/users', {
    params: {
      page: params.page,
      limit: params.limit,
      search: params.search || undefined,
      role: params.role,
      isActive: params.isActive === undefined ? undefined : String(params.isActive),
    },
    signal,
  });

  if (!isPaginationMeta(data.meta)) throw new Error('Unexpected users response from the server');
  return { items: data.data, meta: data.meta };
}

export async function getUser(id: string, signal?: AbortSignal): Promise<AuthUser> {
  const { data } = await apiClient.get<ApiSuccess<UserPayload>>(`/users/${encodeURIComponent(id)}`, {
    signal,
  });
  return data.data.user;
}

export async function createUser(payload: CreateUserPayload): Promise<AuthUser> {
  const { data } = await apiClient.post<ApiSuccess<UserPayload>>('/users', payload);
  return data.data.user;
}

export async function updateUser(id: string, payload: UpdateUserPayload): Promise<AuthUser> {
  const { data } = await apiClient.patch<ApiSuccess<UserPayload>>(
    `/users/${encodeURIComponent(id)}`,
    payload,
  );
  return data.data.user;
}

export async function updateUserStatus(id: string, isActive: boolean): Promise<AuthUser> {
  const { data } = await apiClient.patch<ApiSuccess<UserPayload>>(
    `/users/${encodeURIComponent(id)}/status`,
    { isActive },
  );
  return data.data.user;
}
