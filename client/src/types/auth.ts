export const ROLES = ['ADMIN', 'PROJECT_MANAGER', 'MEMBER'] as const;

export type Role = (typeof ROLES)[number];

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  /** null until the email is verified (self-registered) — admin-created accounts are verified. */
  emailVerifiedAt: string | null;
  /** Admin user detail only: a new address waiting for its verification code. */
  /** Admin user detail only: why the role cannot be changed right now (null when it can). */
  roleLockedReason?: string | null;
  /** Admin user detail only: projects a Project Manager manages / a Member belongs to. */
  projects?: UserProjectRef[];
  pendingEmail?: string | null;
  /** With pendingEmail: seconds until another code may be requested. */
  emailChangeResendAfter?: number;
  createdAt: string;
  updatedAt: string;
}

export interface AuthUserPayload {
  user: AuthUser;
}
