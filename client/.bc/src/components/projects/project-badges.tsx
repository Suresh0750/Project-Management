import { Badge, type BadgeTone } from '@/components/ui/badge';
import {
  PRIORITY_LABEL,
  PROJECT_STATUS_LABEL,
  type Priority,
  type ProjectStatus,
} from '@/types/project';

const STATUS_TONE: Record<ProjectStatus, BadgeTone> = {
  PLANNING: 'neutral',
  ACTIVE: 'info',
  ON_HOLD: 'warning',
  COMPLETED: 'success',
};

const PRIORITY_TONE: Record<Priority, BadgeTone> = {
  LOW: 'neutral',
  MEDIUM: 'info',
  HIGH: 'warning',
  URGENT: 'danger',
};

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{PROJECT_STATUS_LABEL[status]}</Badge>;
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return <Badge tone={PRIORITY_TONE[priority]}>{PRIORITY_LABEL[priority]}</Badge>;
}
