import {
  emitToProject,
  emitToUser,
  joinProjectRoom,
  leaveProjectRoom,
} from './socket.js';

export interface NotificationDto {
  id: string;
  userId: string;
  type: string;
  message: string;
  readAt: Date | null;
  createdAt: Date;
  projectId: string | null;
  taskId: string | null;
}

/**
 * Collects realtime messages while a database transaction runs and sends them only after it
 * commits, so clients never hear about a change that was rolled back.
 */
export class Outbox {
  private readonly joins: Array<[string, string]> = [];
  private readonly leaves: Array<[string, string]> = [];
  private readonly notifications: NotificationDto[] = [];
  private readonly events: Array<{ projectId: string; event: string; payload: unknown }> = [];

  addNotifications(rows: NotificationDto[]): void {
    this.notifications.push(...rows);
  }

  addProjectEvent(projectId: string, event: string, payload: Record<string, unknown> = {}): void {
    this.events.push({ projectId, event, payload: { projectId, ...payload } });
  }

  addRoomJoin(userId: string, projectId: string): void {
    this.joins.push([userId, projectId]);
  }

  addRoomLeave(userId: string, projectId: string): void {
    this.leaves.push([userId, projectId]);
  }

  /** Never throws: a realtime failure must not fail a request whose data is already saved. */
  flush(): void {
    try {
      for (const [userId, projectId] of this.joins) joinProjectRoom(userId, projectId);
      for (const { projectId, event, payload } of this.events) {
        emitToProject(projectId, event, payload);
      }
      for (const { userId, ...notification } of this.notifications) {
        emitToUser(userId, 'notification:new', { userId, ...notification });
      }
      for (const [userId, projectId] of this.leaves) leaveProjectRoom(userId, projectId);
    } catch (error) {
      console.error('Realtime publish failed', error);
    }
  }
}
