import { apiClient } from '@/lib/api/client';
import { isPaginationMeta, type ApiSuccess, type Paginated } from '@/lib/api/types';
import type { ProjectFormValues } from '@/schemas/project';
import type {
  PersonRef,
  Priority,
  Project,
  ProjectActivity,
  ProjectDetail,
  ProjectStatus,
} from '@/types/project';

export interface ListProjectsParams {
  page: number;
  limit: number;
  search?: string;
  status?: ProjectStatus;
  priority?: Priority;
  archived: boolean;
}

export interface ProjectPayload {
  name: string;
  description: string | null;
  priority: Priority;
  status: ProjectStatus;
  startDate: string | null;
  deadline: string | null;
  managerId?: string;
}

interface ProjectEnvelope {
  project: ProjectDetail;
}

/** Form strings → API payload: empty optional fields become null so they can be cleared. */
export function toProjectPayload(values: ProjectFormValues, includeManager: boolean): ProjectPayload {
  return {
    name: values.name,
    description: values.description === '' ? null : values.description,
    priority: values.priority,
    status: values.status,
    startDate: values.startDate === '' ? null : values.startDate,
    deadline: values.deadline === '' ? null : values.deadline,
    ...(includeManager ? { managerId: values.managerId } : {}),
  };
}

function paginated<T>(body: ApiSuccess<T[]>): Paginated<T> {
  if (!isPaginationMeta(body.meta)) throw new Error('Unexpected response from the server');
  return { items: body.data, meta: body.meta };
}

const projectPath = (id: string) => `/projects/${encodeURIComponent(id)}`;

export async function listProjects(
  params: ListProjectsParams,
  signal?: AbortSignal,
): Promise<Paginated<Project>> {
  const { data } = await apiClient.get<ApiSuccess<Project[]>>('/projects', {
    params: {
      page: params.page,
      limit: params.limit,
      search: params.search || undefined,
      status: params.status,
      priority: params.priority,
      archived: String(params.archived),
    },
    signal,
  });
  return paginated(data);
}

export async function getProject(id: string, signal?: AbortSignal): Promise<ProjectDetail> {
  const { data } = await apiClient.get<ApiSuccess<ProjectEnvelope>>(projectPath(id), { signal });
  return data.data.project;
}

export async function createProject(payload: ProjectPayload): Promise<ProjectDetail> {
  const { data } = await apiClient.post<ApiSuccess<ProjectEnvelope>>('/projects', payload);
  return data.data.project;
}

export async function updateProject(
  id: string,
  payload: Partial<ProjectPayload>,
): Promise<ProjectDetail> {
  const { data } = await apiClient.patch<ApiSuccess<ProjectEnvelope>>(projectPath(id), payload);
  return data.data.project;
}

export async function setProjectArchived(id: string, archived: boolean): Promise<ProjectDetail> {
  const { data } = await apiClient.patch<ApiSuccess<ProjectEnvelope>>(`${projectPath(id)}/archive`, {
    archived,
  });
  return data.data.project;
}

export async function addProjectMember(id: string, userId: string): Promise<ProjectDetail> {
  const { data } = await apiClient.post<ApiSuccess<ProjectEnvelope>>(`${projectPath(id)}/members`, {
    userId,
  });
  return data.data.project;
}

export async function removeProjectMember(id: string, userId: string): Promise<ProjectDetail> {
  const { data } = await apiClient.delete<ApiSuccess<ProjectEnvelope>>(
    `${projectPath(id)}/members/${encodeURIComponent(userId)}`,
  );
  return data.data.project;
}

export async function listMemberCandidates(
  id: string,
  search: string,
  signal?: AbortSignal,
): Promise<PersonRef[]> {
  const { data } = await apiClient.get<ApiSuccess<PersonRef[]>>(
    `${projectPath(id)}/member-candidates`,
    { params: { search: search || undefined }, signal },
  );
  return data.data;
}

export async function listProjectActivities(
  id: string,
  page: number,
  signal?: AbortSignal,
): Promise<Paginated<ProjectActivity>> {
  const { data } = await apiClient.get<ApiSuccess<ProjectActivity[]>>(
    `${projectPath(id)}/activities`,
    { params: { page, limit: 10 }, signal },
  );
  return paginated(data);
}
