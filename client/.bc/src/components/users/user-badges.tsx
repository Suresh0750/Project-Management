import { Badge, type BadgeTone } from '@/components/ui/badge';
import { ROLE_LABEL } from '@/lib/auth/navigation';
import type { Role } from '@/types/auth';

const ROLE_TONE: Record<Role, BadgeTone> = {
  ADMIN: 'danger',
  PROJECT_MANAGER: 'info',
  MEMBER: 'neutral',
};

export function RoleBadge({ role }: { role: Role }) {
  return <Badge tone={ROLE_TONE[role]}>{ROLE_LABEL[role]}</Badge>;
}

export function UserStatusBadge({ isActive }: { isActive: boolean }) {
  return <Badge tone={isActive ? 'success' : 'neutral'}>{isActive ? 'Active' : 'Inactive'}</Badge>;
}

export function EmailVerifiedBadge({ verifiedAt }: { verifiedAt: string | null }) {
  return verifiedAt ? (
    <Badge tone="success">Email verified</Badge>
  ) : (
    <Badge tone="warning">Email unverified</Badge>
  );
}
