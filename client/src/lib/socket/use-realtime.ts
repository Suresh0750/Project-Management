'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useToast } from '@/components/ui/toast-provider';
import { notificationsKeys } from '@/features/notifications/hooks';
import { apiClient } from '@/lib/api/client';
import { getSocket } from '@/lib/socket/client';

/** Events that mean "data you may be looking at changed on the server". */
const DATA_EVENTS = [
  'task:created',
  'task:updated',
  'task:assigned',
  'task:statusChanged',
  'activity:new',
  'project:updated',
  'project:memberAdded',
  'project:memberRemoved',
] as const;

const MAX_AUTH_RETRIES = 3;

/**
 * Keeps the app live while signed in. REST stays the source of truth: every event only
 * invalidates cached queries (or shows a toast), so a missed event is repaired by the next fetch.
 * Mount it once, inside the authenticated shell.
 */
export function useRealtime(): void {
  const queryClient = useQueryClient();
  const toast = useToast();

  useEffect(() => {
    const socket = getSocket();
    let authRetries = 0;
    let refreshing = false;

    // The access token is short-lived and only checked at connect time. When the server rejects
    // or ends the connection for that reason, refresh the session and reconnect (bounded).
    const reconnectWithFreshSession = async () => {
      if (refreshing || authRetries >= MAX_AUTH_RETRIES) return;
      refreshing = true;
      authRetries += 1;
      try {
        await apiClient.post('/auth/refresh');
        socket.connect();
      } catch {
        // Session is gone; the next REST call sends the user to /login.
        void queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      } finally {
        refreshing = false;
      }
    };

    const onDataChanged = () => {
      void queryClient.invalidateQueries({ queryKey: ['tasks'] });
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
      void queryClient.invalidateQueries({ queryKey: ['activities'] });
      void queryClient.invalidateQueries({ queryKey: notificationsKeys.all });
    };

    let connectedBefore = false;
    const onConnect = () => {
      authRetries = 0;
      // After a reconnect, events may have been missed: re-sync from the server.
      if (connectedBefore) onDataChanged();
      connectedBefore = true;
    };
    const onConnectError = (error: Error) => {
      if (error.message === 'unauthorized') void reconnectWithFreshSession();
    };
    const onDisconnect = (reason: string) => {
      if (reason === 'io server disconnect') void reconnectWithFreshSession();
    };

    const onNotification = (payload: { message?: unknown }) => {
      void queryClient.invalidateQueries({ queryKey: notificationsKeys.all });
      if (typeof payload.message === 'string') toast.info(payload.message);
    };
    const onNotificationRead = () => {
      void queryClient.invalidateQueries({ queryKey: notificationsKeys.all });
    };
    socket.on('connect', onConnect);
    socket.on('connect_error', onConnectError);
    socket.on('disconnect', onDisconnect);
    socket.on('notification:new', onNotification);
    socket.on('notification:read', onNotificationRead);
    for (const event of DATA_EVENTS) socket.on(event, onDataChanged);

    socket.connect();

    // Removing the exact handlers prevents duplicate subscriptions across re-mounts.
    return () => {
      socket.off('connect', onConnect);
      socket.off('connect_error', onConnectError);
      socket.off('disconnect', onDisconnect);
      socket.off('notification:new', onNotification);
      socket.off('notification:read', onNotificationRead);
      for (const event of DATA_EVENTS) socket.off(event, onDataChanged);
      socket.disconnect();
    };
  }, [queryClient, toast]);
}
