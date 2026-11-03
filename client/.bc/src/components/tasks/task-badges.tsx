import { Badge, type BadgeTone } from '@/components/ui/badge';
import { TASK_STATUS_LABEL, type TaskStatus } from '@/types/task';

const STATUS_TONE: Record<TaskStatus, BadgeTone> = {
  TODO: 'neutral',
  IN_PROGRESS: 'info',
  IN_REVIEW: 'warning',
  COMPLETED: 'success',
};

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{TASK_STATUS_LABEL[status]}</Badge>;
}
