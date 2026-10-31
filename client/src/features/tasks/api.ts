import { apiClient } from '@/lib/api/client';
import { isPaginationMeta, type ApiSuccess, type Paginated } from '@/lib/api/types';
import type { TaskFormValues } from '@/schemas/task';
import type { Priority } from '@/types/project';
import type {
  DueFilter,
  Task,
  TaskActivity,
  TaskComment,
  TaskStatus,
} from '@/types/task';

export type TaskSortBy = 'createdAt' | 'dueDate' | 'priority' | 'position';

export interface ListTasksParams {
  page: number;
  limit: number;
  search?: string;
  projectId?: string;
  /** A user id, "me" or "unassigned". */
  assigneeId?: string;
  status?: TaskStatus;
  priority?: Priority;
  due?: DueFilter;
  sortBy: TaskSortBy;
  order: 'asc' | 'desc';
}

export interface CreateTaskPayload {
  title: string;
  description: string | null;
  projectId: string;
  assigneeId: string | null;
  priority: Priority;
  status: TaskStatus;
  dueDate: string | null;
}

export interface UpdateTaskPayload {
  title?: string;
  description?: string | null;
  priority?: Priority;
  dueDate?: string | null;
}

export function toCreateTaskPayload(values: TaskFormValues): CreateTaskPayload {
  return {
    title: values.title,
    description: values.description === '' ? null : values.description,
    projectId: values.projectId,
    assigneeId: values.assigneeId === '' ? null : values.assigneeId,
    priority: values.priority,
    status: values.status,
    dueDate: values.dueDate === '' ? null : values.dueDate,
  };
}

interface TaskEnvelope {
  task: Task;
}

const taskPath = (id: string) => `/tasks/${encodeURIComponent(id)}`;

export async function listTasks(
  params: ListTasksParams,
  signal?: AbortSignal,
): Promise<Paginated<Task>> {
  const { data } = await apiClient.get<ApiSuccess<Task[]>>('/tasks', {
    params: {
      ...params,
      search: params.search || undefined,
    },
    signal,
  });
  if (!isPaginationMeta(data.meta)) throw new Error('Unexpected response from the server');
  return { items: data.data, meta: data.meta };
}

export async function getTask(id: string, signal?: AbortSignal): Promise<Task> {
  const { data } = await apiClient.get<ApiSuccess<TaskEnvelope>>(taskPath(id), { signal });
  return data.data.task;
}

export async function createTask(payload: CreateTaskPayload): Promise<Task> {
  const { data } = await apiClient.post<ApiSuccess<TaskEnvelope>>('/tasks', payload);
  return data.data.task;
}

export async function updateTask(id: string, payload: UpdateTaskPayload): Promise<Task> {
  const { data } = await apiClient.patch<ApiSuccess<TaskEnvelope>>(taskPath(id), payload);
  return data.data.task;
}

export async function updateTaskStatus(
  id: string,
  status: TaskStatus,
  beforeTaskId?: string | null,
): Promise<Task> {
  const { data } = await apiClient.patch<ApiSuccess<TaskEnvelope>>(`${taskPath(id)}/status`, {
    status,
    beforeTaskId: beforeTaskId ?? null,
  });
  return data.data.task;
}

export async function assignTask(id: string, assigneeId: string | null): Promise<Task> {
  const { data } = await apiClient.patch<ApiSuccess<TaskEnvelope>>(`${taskPath(id)}/assign`, {
    assigneeId,
  });
  return data.data.task;
}

export async function deleteTask(id: string): Promise<void> {
  await apiClient.delete(taskPath(id));
}

export async function listComments(id: string, signal?: AbortSignal): Promise<TaskComment[]> {
  const { data } = await apiClient.get<ApiSuccess<TaskComment[]>>(`${taskPath(id)}/comments`, {
    signal,
  });
  return data.data;
}

export async function addComment(id: string, content: string): Promise<TaskComment> {
  const { data } = await apiClient.post<ApiSuccess<{ comment: TaskComment }>>(
    `${taskPath(id)}/comments`,
    { content },
  );
  return data.data.comment;
}

export async function listTaskActivities(id: string, signal?: AbortSignal): Promise<TaskActivity[]> {
  const { data } = await apiClient.get<ApiSuccess<TaskActivity[]>>(`${taskPath(id)}/activities`, {
    signal,
  });
  return data.data;
}
