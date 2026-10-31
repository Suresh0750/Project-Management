export const ACTIVITY_ACTIONS = [
  'PROJECT_CREATED',
  'PROJECT_UPDATED',
  'PROJECT_ARCHIVED',
  'MEMBER_ADDED',
  'MEMBER_REMOVED',
  'TASK_CREATED',
  'TASK_UPDATED',
  'TASK_STATUS_CHANGED',
  'TASK_ASSIGNED',
  'TASK_DELETED',
  'COMMENT_ADDED',
] as const;

export type ActivityAction = (typeof ACTIVITY_ACTIONS)[number];

export const ACTIVITY_ACTION_LABEL: Record<ActivityAction, string> = {
  PROJECT_CREATED: 'Project created',
  PROJECT_UPDATED: 'Project updated',
  PROJECT_ARCHIVED: 'Project archived',
  MEMBER_ADDED: 'Member added',
  MEMBER_REMOVED: 'Member removed',
  TASK_CREATED: 'Task created',
  TASK_UPDATED: 'Task updated',
  TASK_STATUS_CHANGED: 'Status changed',
  TASK_ASSIGNED: 'Task assigned',
  TASK_DELETED: 'Task deleted',
  COMMENT_ADDED: 'Comment added',
};

/** One entry in the immutable history. `project` and `task` are present on the global feed. */
export interface ActivityItem {
  id: string;
  action: string;
  message: string;
  createdAt: string;
  actor: { id: string; name: string } | null;
  project?: { id: string; name: string };
  task?: { id: string; title: string; deleted: boolean } | null;
}
