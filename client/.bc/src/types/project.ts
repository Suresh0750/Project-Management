import type { AuthUser } from '@/types/auth';

export const PROJECT_STATUSES = ['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED'] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
export type Priority = (typeof PRIORITIES)[number];

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  PLANNING: 'Planning',
  ACTIVE: 'Active',
  ON_HOLD: 'On hold',
  COMPLETED: 'Completed',
};

export const PRIORITY_LABEL: Record<Priority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent',
};

export interface PersonRef {
  id: string;
  name: string;
  email: string;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  priority: Priority;
  startDate: string | null;
  deadline: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  managerId: string;
  manager: PersonRef;
  memberCount: number;
  taskCount: number;
  completedTaskCount: number;
  /** 0–100, share of tasks that are completed. */
  progress: number;
}

export interface ProjectMember extends AuthUser {
  joinedAt: string;
}

export interface ProjectDetail extends Project {
  members: ProjectMember[];
  /** Computed by the server for the signed-in user; the server still enforces it per request. */
  canManage: boolean;
}

export interface ProjectActivity {
  id: string;
  action: string;
  message: string;
  createdAt: string;
  actor: { id: string; name: string } | null;
}

/** Whether a project may be archived, with the reasons. The server enforces the same rules. */
export interface ArchiveReadiness {
  canArchive: boolean;
  /** Reasons archiving is refused. */
  blockers: string[];
  /** Things worth a look, but they do not stop archiving. */
  warnings: string[];
  stats: {
    totalTasks: number;
    completedTasks: number;
    overdueTasks: number;
    unassignedTasks: number;
    memberCount: number;
  };
}
