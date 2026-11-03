'use client';

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import {
  addComment,
  assignTask,
  createTask,
  deleteTask,
  getTask,
  listComments,
  listTaskActivities,
  listTasks,
  updateTask,
  updateTaskStatus,
  type CreateTaskPayload,
  type ListTasksParams,
  type UpdateTaskPayload,
} from '@/features/tasks/api';
import { projectsKeys } from '@/features/projects/hooks';
import type { ApiError } from '@/lib/api/errors';
import type { Task, TaskComment, TaskStatus } from '@/types/task';

export const tasksKeys = {
  all: ['tasks'] as const,
  list: (params: ListTasksParams) => ['tasks', 'list', params] as const,
  detail: (id: string) => ['tasks', 'detail', id] as const,
  comments: (id: string) => ['tasks', 'comments', id] as const,
  activities: (id: string) => ['tasks', 'activities', id] as const,
};

export function useTasks(params: ListTasksParams, enabled = true) {
  return useQuery({
    queryKey: tasksKeys.list(params),
    queryFn: ({ signal }) => listTasks(params, signal),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useTask(id: string) {
  return useQuery<Task, ApiError>({
    queryKey: tasksKeys.detail(id),
    queryFn: ({ signal }) => getTask(id, signal),
  });
}

export function useTaskComments(id: string) {
  return useQuery<TaskComment[], ApiError>({
    queryKey: tasksKeys.comments(id),
    queryFn: ({ signal }) => listComments(id, signal),
  });
}

export function useTaskActivities(id: string) {
  return useQuery({
    queryKey: tasksKeys.activities(id),
    queryFn: ({ signal }) => listTaskActivities(id, signal),
  });
}

/** Refresh the task everywhere it appears: lists, detail, timeline and project progress. */
function syncTask(queryClient: QueryClient, task: Task) {
  queryClient.setQueryData(tasksKeys.detail(task.id), task);
  void queryClient.invalidateQueries({ queryKey: [...tasksKeys.all, 'list'] });
  void queryClient.invalidateQueries({ queryKey: tasksKeys.activities(task.id) });
  void queryClient.invalidateQueries({ queryKey: projectsKeys.all });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation<Task, ApiError, CreateTaskPayload>({
    mutationFn: createTask,
    onSuccess: (task) => syncTask(queryClient, task),
  });
}

export function useUpdateTask(id: string) {
  const queryClient = useQueryClient();
  return useMutation<Task, ApiError, UpdateTaskPayload>({
    mutationFn: (payload) => updateTask(id, payload),
    onSuccess: (task) => syncTask(queryClient, task),
  });
}

export function useUpdateTaskStatus() {
  const queryClient = useQueryClient();
  return useMutation<
    Task,
    ApiError,
    { id: string; status: TaskStatus; beforeTaskId?: string | null }
  >({
    mutationFn: ({ id, status, beforeTaskId }) => updateTaskStatus(id, status, beforeTaskId),
    onSuccess: (task) => syncTask(queryClient, task),
  });
}

export function useAssignTask(id: string) {
  const queryClient = useQueryClient();
  return useMutation<Task, ApiError, string | null>({
    mutationFn: (assigneeId) => assignTask(id, assigneeId),
    onSuccess: (task) => syncTask(queryClient, task),
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: deleteTask,
    onSuccess: (_result, id) => {
      queryClient.removeQueries({ queryKey: tasksKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: [...tasksKeys.all, 'list'] });
      void queryClient.invalidateQueries({ queryKey: projectsKeys.all });
    },
  });
}

export function useAddComment(id: string) {
  const queryClient = useQueryClient();
  return useMutation<TaskComment, ApiError, string>({
    mutationFn: (content) => addComment(id, content),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: tasksKeys.comments(id) });
      void queryClient.invalidateQueries({ queryKey: tasksKeys.activities(id) });
    },
  });
}
