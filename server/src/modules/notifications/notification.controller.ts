import { success } from '../../utils/apiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import * as service from './notification.service.js';
import type { ListNotificationsQuery } from './notification.validation.js';

export const listNotifications = asyncHandler(async (req, res) => {
  const result = await service.listNotifications(
    req.user!,
    req.query as unknown as ListNotificationsQuery,
  );
  res.status(200).json(success(result.notifications, 'Notifications fetched successfully', result.meta));
});

export const getUnreadCount = asyncHandler(async (req, res) => {
  const unreadCount = await service.getUnreadCount(req.user!);
  res.status(200).json(success({ unreadCount }, 'Unread count fetched successfully'));
});

export const markRead = asyncHandler(async (req, res) => {
  const notification = await service.markRead(req.user!, req.params.id as string);
  res.status(200).json(success({ notification }, 'Notification marked as read'));
});

export const markAllRead = asyncHandler(async (req, res) => {
  const updated = await service.markAllRead(req.user!);
  res.status(200).json(success({ updated }, 'All notifications marked as read'));
});
