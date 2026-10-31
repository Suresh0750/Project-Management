'use client';

import { useMemo } from 'react';
import type { SelectOption } from '@/components/ui/select-field';
import { useUsers } from '@/features/users/hooks';
import type { Role } from '@/types/auth';

/** Project Manager choices for the project form. Only administrators can list users. */
export function useManagerField(role: Role) {
  const isAdmin = role === 'ADMIN';
  const managers = useUsers(
    { page: 1, limit: 100, role: 'PROJECT_MANAGER', isActive: true },
    isAdmin,
  );

  const options = useMemo<SelectOption[]>(
    () =>
      (managers.data?.items ?? []).map((user) => ({
        value: user.id,
        label: `${user.name} (${user.email})`,
      })),
    [managers.data],
  );

  if (!isAdmin) return undefined;

  return {
    options,
    loading: managers.isPending,
    ...(managers.isError ? { error: 'Could not load Project Managers. Reload to try again.' } : {}),
  };
}
