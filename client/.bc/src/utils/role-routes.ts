import type { Role } from '@/types/auth';

export const ROLE_HOME: Record<Role, string> = {
  ADMIN: '/admin/dashboard',
  PROJECT_MANAGER: '/manager/dashboard',
  MEMBER: '/member/dashboard',
};

const ROLE_PREFIX: Record<Role, string> = {
  ADMIN: '/admin/',
  PROJECT_MANAGER: '/manager/',
  MEMBER: '/member/',
};

/**
 * Only honours a `next` redirect target that is a same-origin path inside the
 * signed-in role's own area; anything else falls back to the role dashboard.
 */
export function resolvePostLoginPath(role: Role, next: string | null): string {
  if (next && next.startsWith(ROLE_PREFIX[role]) && !next.startsWith('//')) {
    return next;
  }
  return ROLE_HOME[role];
}
