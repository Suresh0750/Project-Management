'use client';

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import {
  addProjectMember,
  createProject,
  listMemberCandidates,
  listProjectActivities,
  listProjects,
  getProject,
  removeProjectMember,
  setProjectArchived,
  updateProject,
  type ListProjectsParams,
  type ProjectPayload,
} from '@/features/projects/api';
import type { ApiError } from '@/lib/api/errors';
import type { ProjectDetail } from '@/types/project';

export const projectsKeys = {
  all: ['projects'] as const,
  list: (params: ListProjectsParams) => ['projects', 'list', params] as const,
  detail: (id: string) => ['projects', 'detail', id] as const,
  candidates: (id: string, search: string) => ['projects', 'candidates', id, search] as const,
  activities: (id: string, page: number) => ['projects', 'activities', id, page] as const,
};

export function useProjects(params: ListProjectsParams, enabled = true) {
  return useQuery({
    queryKey: projectsKeys.list(params),
    queryFn: ({ signal }) => listProjects(params, signal),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useProject(id: string, enabled = true) {
  return useQuery<ProjectDetail, ApiError>({
    queryKey: projectsKeys.detail(id),
    queryFn: ({ signal }) => getProject(id, signal),
    enabled,
  });
}

export function useMemberCandidates(id: string, search: string, enabled: boolean) {
  return useQuery({
    queryKey: projectsKeys.candidates(id, search),
    queryFn: ({ signal }) => listMemberCandidates(id, search, signal),
    enabled,
    placeholderData: keepPreviousData,
  });
}

export function useProjectActivities(id: string, page: number, enabled: boolean) {
  return useQuery({
    queryKey: projectsKeys.activities(id, page),
    queryFn: ({ signal }) => listProjectActivities(id, page, signal),
    enabled,
    placeholderData: keepPreviousData,
  });
}

/** Write the fresh detail into the cache and refresh anything derived from it. */
function syncProject(queryClient: QueryClient, project: ProjectDetail) {
  queryClient.setQueryData(projectsKeys.detail(project.id), project);
  void queryClient.invalidateQueries({ queryKey: [...projectsKeys.all, 'list'] });
  void queryClient.invalidateQueries({ queryKey: [...projectsKeys.all, 'activities', project.id] });
  void queryClient.invalidateQueries({ queryKey: [...projectsKeys.all, 'candidates', project.id] });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation<ProjectDetail, ApiError, ProjectPayload>({
    mutationFn: createProject,
    onSuccess: (project) => syncProject(queryClient, project),
  });
}

export function useUpdateProject(id: string) {
  const queryClient = useQueryClient();
  return useMutation<ProjectDetail, ApiError, Partial<ProjectPayload>>({
    mutationFn: (payload) => updateProject(id, payload),
    onSuccess: (project) => syncProject(queryClient, project),
  });
}

export function useArchiveProject(id: string) {
  const queryClient = useQueryClient();
  return useMutation<ProjectDetail, ApiError, boolean>({
    mutationFn: (archived) => setProjectArchived(id, archived),
    onSuccess: (project) => syncProject(queryClient, project),
  });
}

export function useAddMember(id: string) {
  const queryClient = useQueryClient();
  return useMutation<ProjectDetail, ApiError, string>({
    mutationFn: (userId) => addProjectMember(id, userId),
    onSuccess: (project) => syncProject(queryClient, project),
  });
}

export function useRemoveMember(id: string) {
  const queryClient = useQueryClient();
  return useMutation<ProjectDetail, ApiError, string>({
    mutationFn: (userId) => removeProjectMember(id, userId),
    onSuccess: (project) => syncProject(queryClient, project),
  });
}
