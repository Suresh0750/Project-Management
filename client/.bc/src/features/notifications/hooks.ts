'use client';

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import {
  getUnreadCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type ListNotificationsParams,
  type NotificationPage,
} from '@/features/notifications/api';
import type { ApiError } from '@/lib/api/errors';

export const notificationsKeys = {
  all: ['notifications'] as const,
  list: (params: ListNotificationsParams) => ['notifications', 'list', params] as const,
  unread: ['notifications', 'unread'] as const,
};

export function useNotifications(params: ListNotificationsParams, enabled = true) {
  return useQuery({
    queryKey: notificationsKeys.list(params),
    queryFn: ({ signal }) => listNotifications(params, signal),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useUnreadCount() {
  return useQuery<number, ApiError>({
    queryKey: notificationsKeys.unread,
    queryFn: ({ signal }) => getUnreadCount(signal),
    staleTime: 60_000,
  });
}

/** Patch every cached list page in place so the UI reacts before the server answers. */
function patchLists(queryClient: QueryClient, patch: (page: NotificationPage) => NotificationPage) {
  queryClient.setQueriesData<NotificationPage>(
    { queryKey: [...notificationsKeys.all, 'list'] },
    (page) => (page ? patch(page) : page),
  );
}

export function useMarkRead() {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, { id: string; wasUnread: boolean }>({
    mutationFn: ({ id }) => markNotificationRead(id),
    onMutate: async ({ id, wasUnread }) => {
      await queryClient.cancelQueries({ queryKey: notificationsKeys.all });
      if (wasUnread) {
        queryClient.setQueryData<number>(notificationsKeys.unread, (count) =>
          Math.max(0, (count ?? 1) - 1),
        );
      }
      const readAt = new Date().toISOString();
      patchLists(queryClient, (page) => ({
        ...page,
        unreadCount: wasUnread ? Math.max(0, page.unreadCount - 1) : page.unreadCount,
        items: page.items.map((item) => (item.id === id && !item.readAt ? { ...item, readAt } : item)),
      }));
    },
    // Roll back by refetching the truth from the server.
    onSettled: () => queryClient.invalidateQueries({ queryKey: notificationsKeys.all }),
  });
}

export function useMarkAllRead() {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError>({
    mutationFn: markAllNotificationsRead,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: notificationsKeys.all });
      queryClient.setQueryData<number>(notificationsKeys.unread, 0);
      const readAt = new Date().toISOString();
      patchLists(queryClient, (page) => ({
        ...page,
        unreadCount: 0,
        items: page.items.map((item) => (item.readAt ? item : { ...item, readAt })),
      }));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: notificationsKeys.all }),
  });
}
