import type { PersonRef, Priority } from '@/types/project';

export const TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  COMPLETED: 'Completed',
};

export const DUE_FILTERS = ['overdue', 'today', 'this_week', 'no_due_date'] as const;
export type DueFilter = (typeof DUE_FILTERS)[number];

export const DUE_FILTER_LABEL: Record<DueFilter, string> = {
  overdue: 'Overdue',
  today: 'Due today',
  this_week: 'Due this week',
  no_due_date: 'No due date',
};

/** Computed by the server for the signed-in user; the server still enforces each action. */
export interface TaskPermissions {
  canEdit: boolean;
  canEditAllFields: boolean;
  canAssign: boolean;
  canDelete: boolean;
  canChangeStatus: boolean;
  canComment: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  dueDate: string | null;
  position: number;
  projectId: string;
  creatorId: string;
  assigneeId: string | null;
  createdAt: string;
  updatedAt: string;
  project: { id: string; name: string; archivedAt: string | null };
  assignee: PersonRef | null;
  creator: PersonRef;
  permissions: TaskPermissions;
}

export interface TaskComment {
  id: string;
  content: string;
  createdAt: string;
  author: { id: string; name: string };
}

export interface TaskActivity {
  id: string;
  action: string;
  message: string;
  createdAt: string;
  actor: { id: string; name: string } | null;
}

export function isOverdue(task: Pick<Task, 'dueDate' | 'status'>): boolean {
  if (!task.dueDate || task.status === 'COMPLETED') return false;
  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return new Date(task.dueDate).getTime() < today;
}
