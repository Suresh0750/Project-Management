import { Role } from '@prisma/client';

// ─── Cookie names ─────────────────────────────────────────────────────────────
export const ACCESS_TOKEN_COOKIE = 'access_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';

// ─── Cookie options ───────────────────────────────────────────────────────────
export const ACCESS_COOKIE_MAX_AGE_MS = 15 * 60 * 1000;           // 15 min
export const REFRESH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// ─── Pagination defaults ──────────────────────────────────────────────────────
export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

// ─── Roles that are allowed to be assigned through the public API ─────────────
export const ASSIGNABLE_ROLES = [Role.PROJECT_MANAGER, Role.MEMBER] as const;

// ─── Safe user fields (never include passwordHash) ───────────────────────────
export const SAFE_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  emailVerifiedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;
