import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { success } from '../../utils/apiResponse.js';
import * as projectsService from './projects.service.js';
import type {
  CreateProjectInput,
  ListProjectsQuery,
  MemberCandidatesQuery,
  ProjectActivitiesQuery,
  UpdateProjectInput,
} from './projects.validation.js';

/** Wraps an async handler so rejections reach the error middleware. */
function handler(fn: (req: Request, res: Response) => Promise<void>): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}

const idOf = (req: Request): string => req.params.id as string;

export const listProjects = handler(async (req, res) => {
  const result = await projectsService.listProjects(
    req.user!,
    req.query as unknown as ListProjectsQuery,
  );
  res.status(200).json(success(result.projects, 'Projects fetched successfully', result.meta));
});

export const getProject = handler(async (req, res) => {
  const project = await projectsService.getProject(req.user!, idOf(req));
  res.status(200).json(success({ project }, 'Project fetched successfully'));
});

export const createProject = handler(async (req, res) => {
  const project = await projectsService.createProject(req.user!, req.body as CreateProjectInput);
  res.status(201).json(success({ project }, 'Project created successfully'));
});

export const updateProject = handler(async (req, res) => {
  const project = await projectsService.updateProject(
    req.user!,
    idOf(req),
    req.body as UpdateProjectInput,
  );
  res.status(200).json(success({ project }, 'Project updated successfully'));
});

export const archiveProject = handler(async (req, res) => {
  const { archived } = req.body as { archived: boolean };
  const project = await projectsService.setProjectArchived(req.user!, idOf(req), archived);
  res
    .status(200)
    .json(success({ project }, archived ? 'Project archived successfully' : 'Project restored'));
});

export const addMember = handler(async (req, res) => {
  const { userId } = req.body as { userId: string };
  const project = await projectsService.addMember(req.user!, idOf(req), userId);
  res.status(201).json(success({ project }, 'Member added successfully'));
});

export const removeMember = handler(async (req, res) => {
  const project = await projectsService.removeMember(
    req.user!,
    idOf(req),
    req.params.userId as string,
  );
  res.status(200).json(success({ project }, 'Member removed successfully'));
});

export const listMemberCandidates = handler(async (req, res) => {
  const candidates = await projectsService.listMemberCandidates(
    req.user!,
    idOf(req),
    req.query as unknown as MemberCandidatesQuery,
  );
  res.status(200).json(success(candidates, 'Candidates fetched successfully'));
});

export const listProjectActivities = handler(async (req, res) => {
  const result = await projectsService.listProjectActivities(
    req.user!,
    idOf(req),
    req.query as unknown as ProjectActivitiesQuery,
  );
  res.status(200).json(success(result.activities, 'Activities fetched successfully', result.meta));
});
