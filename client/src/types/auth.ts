export const ROLES = ['ADMIN', 'PROJECT_MANAGER', 'MEMBER'] as const;

export type Role = (typeof ROLES)[number];

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthUserPayload {
  user: AuthUser;
}
