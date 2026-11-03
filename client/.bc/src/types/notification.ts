export const NOTIFICATION_TYPES = [
  'TASK_ASSIGNED',
  'TASK_STATUS_CHANGED',
  'TASK_COMMENT',
  'TASK_UNASSIGNED',
  'PROJECT_MEMBER_ADDED',
  'PROJECT_MEMBER_REMOVED',
  'PROJECT_MANAGER_ASSIGNED',
  'PROJECT_MANAGER_REMOVED',
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_TYPE_LABEL: Record<NotificationType, string> = {
  TASK_ASSIGNED: 'Task assigned',
  TASK_STATUS_CHANGED: 'Status changed',
  TASK_COMMENT: 'New comment',
  TASK_UNASSIGNED: 'Task unassigned',
  PROJECT_MEMBER_ADDED: 'Added to project',
  PROJECT_MEMBER_REMOVED: 'Removed from project',
  PROJECT_MANAGER_ASSIGNED: 'Made Project Manager',
  PROJECT_MANAGER_REMOVED: 'Removed as Project Manager',
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
