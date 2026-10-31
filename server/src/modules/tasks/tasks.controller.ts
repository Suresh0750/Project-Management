import type { Request } from 'express';
import { success } from '../../utils/apiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import * as tasksService from './tasks.service.js';
import type {
  CreateTaskInput,
  ListTasksQuery,
  UpdateTaskInput,
  UpdateTaskStatusInput,
} from './tasks.validation.js';

const idOf = (req: Request): string => req.params.id as string;

export const listTasks = asyncHandler(async (req, res) => {
  const result = await tasksService.listTasks(req.user!, req.query as unknown as ListTasksQuery);
  res.status(200).json(success(result.tasks, 'Tasks fetched successfully', result.meta));
});

export const getTask = asyncHandler(async (req, res) => {
  const task = await tasksService.getTask(req.user!, idOf(req));
  res.status(200).json(success({ task }, 'Task fetched successfully'));
});

export const createTask = asyncHandler(async (req, res) => {
  const task = await tasksService.createTask(req.user!, req.body as CreateTaskInput);
  res.status(201).json(success({ task }, 'Task created successfully'));
});

export const updateTask = asyncHandler(async (req, res) => {
  const task = await tasksService.updateTask(req.user!, idOf(req), req.body as UpdateTaskInput);
  res.status(200).json(success({ task }, 'Task updated successfully'));
});

export const updateTaskStatus = asyncHandler(async (req, res) => {
  const task = await tasksService.updateTaskStatus(
    req.user!,
    idOf(req),
    req.body as UpdateTaskStatusInput,
  );
  res.status(200).json(success({ task }, 'Task status updated successfully'));
});

export const assignTask = asyncHandler(async (req, res) => {
  const { assigneeId } = req.body as { assigneeId: string | null };
  const task = await tasksService.assignTask(req.user!, idOf(req), assigneeId);
  res.status(200).json(success({ task }, 'Task assignment updated successfully'));
});

export const deleteTask = asyncHandler(async (req, res) => {
  await tasksService.deleteTask(req.user!, idOf(req));
  res.status(200).json(success(null, 'Task deleted successfully'));
});

export const listComments = asyncHandler(async (req, res) => {
  const comments = await tasksService.listComments(req.user!, idOf(req));
  res.status(200).json(success(comments, 'Comments fetched successfully'));
});

export const addComment = asyncHandler(async (req, res) => {
  const { content } = req.body as { content: string };
  const comment = await tasksService.addComment(req.user!, idOf(req), content);
  res.status(201).json(success({ comment }, 'Comment added successfully'));
});

export const listTaskActivities = asyncHandler(async (req, res) => {
  const activities = await tasksService.listTaskActivities(req.user!, idOf(req));
  res.status(200).json(success(activities, 'Activities fetched successfully'));
});
