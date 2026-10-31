import { apiClient } from '@/lib/api/client';
import { isPaginationMeta, type ApiSuccess, type PaginationMeta } from '@/lib/api/types';
import type { AppNotification, NotificationType } from '@/types/notification';

export interface ListNotificationsParams {
  page: number;
  limit: number;
  unread?: boolean;
  type?: NotificationType;
}

export interface NotificationPage {
  items: AppNotification[];
  meta: PaginationMeta;
  unreadCount: number;
}

export async function listNotifications(
  params: ListNotificationsParams,
  signal?: AbortSignal,
): Promise<NotificationPage> {
  const { data } = await apiClient.get<ApiSuccess<AppNotification[]>>('/notifications', {
    params: { ...params, unread: params.unread === undefined ? undefined : String(params.unread) },
    signal,
  });

  const meta = data.meta;
  if (!isPaginationMeta(meta) || typeof meta.unreadCount !== 'number') {
    throw new Error('Unexpected response from the server');
  }
  return { items: data.data, meta, unreadCount: meta.unreadCount };
}

export async function getUnreadCount(signal?: AbortSignal): Promise<number> {
  const { data } = await apiClient.get<ApiSuccess<{ unreadCount: number }>>(
    '/notifications/unread-count',
    { signal },
  );
  return data.data.unreadCount;
}

export async function markNotificationRead(id: string): Promise<void> {
  await apiClient.patch(`/notifications/${encodeURIComponent(id)}/read`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiClient.patch('/notifications/read-all');
}
