import { success } from '../../utils/apiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import * as service from './dashboard.service.js';
import type { DashboardListQuery } from './dashboard.validation.js';

const limitOf = (query: unknown): number => (query as DashboardListQuery).limit;

export const getStats = asyncHandler(async (req, res) => {
  const stats = await service.getStats(req.user!, limitOf(req.query));
  res.status(200).json(success(stats, 'Dashboard statistics fetched successfully'));
});

export const getActivity = asyncHandler(async (req, res) => {
  const activities = await service.getRecentActivity(req.user!, limitOf(req.query));
  res.status(200).json(success(activities, 'Recent activity fetched successfully'));
});

export const getProjects = asyncHandler(async (req, res) => {
  const projects = await service.getRecentProjects(req.user!, limitOf(req.query));
  res.status(200).json(success(projects, 'Recent projects fetched successfully'));
});
