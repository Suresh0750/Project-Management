export const NOTIFICATION_TYPES = [
  'TASK_ASSIGNED',
  'TASK_STATUS_CHANGED',
  'TASK_COMMENT',
  'PROJECT_MEMBER_ADDED',
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_TYPE_LABEL: Record<NotificationType, string> = {
  TASK_ASSIGNED: 'Task assigned',
  TASK_STATUS_CHANGED: 'Status changed',
  TASK_COMMENT: 'New comment',
  PROJECT_MEMBER_ADDED: 'Added to project',
};

export interface AppNotification {
  id: string;
  type: string;
  message: string;
  readAt: string | null;
  createdAt: string;
  projectId: string | null;
  taskId: string | null;
}
