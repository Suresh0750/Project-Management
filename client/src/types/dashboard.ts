import type { Role } from '@/types/auth';
import type { PersonRef, Priority } from '@/types/project';
import type { TaskStatus } from '@/types/task';

export type StatusCounts = Record<TaskStatus, number>;

export interface ProjectCompletionItem {
  id: string;
  name: string;
  totalTasks: number;
  completedTasks: number;
  /** 0–100 */
  progress: number;
}

export interface DeadlineTask {
  id: string;
  title: string;
  dueDate: string;
  priority: Priority;
  status: TaskStatus;
  project: { id: string; name: string };
  assignee: PersonRef | null;
}

/** Card fields differ by role, so each is optional; the page shows the ones its role has. */
export interface DashboardCards {
  totalUsers?: number;
  totalProjects?: number;
  myProjects?: number;
  activeProjects?: number;
  assignedTasks?: number;
  totalTasks?: number;
  completedTasks?: number;
  pendingTasks?: number;
  overdueTasks?: number;
}

export interface DashboardStats {
  role: Role;
  cards: DashboardCards;
  taskStatus: StatusCounts;
  projectCompletion: ProjectCompletionItem[];
  upcomingDeadlines: DeadlineTask[];
}
