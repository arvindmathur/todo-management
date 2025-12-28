import { broadcastSyncEvent, SyncEvent } from "./websocket"

// Middleware to broadcast sync events when data changes
export function createSyncMiddleware() {
  return {
    // Task sync events
    onTaskCreated: (task: any) => {
      const event: SyncEvent = {
        type: "task_created",
        entityId: task.id,
        tenantId: task.tenantId,
        userId: task.userId,
        data: task,
        timestamp: Date.now()
      }
      broadcastSyncEvent(event)
    },

    onTaskUpdated: (task: any) => {
      const event: SyncEvent = {
        type: "task_updated",
        entityId: task.id,
        tenantId: task.tenantId,
        userId: task.userId,
        data: task,
        timestamp: Date.now()
      }
      broadcastSyncEvent(event)
    },

    onTaskDeleted: (taskId: string, tenantId: string, userId: string) => {
      const event: SyncEvent = {
        type: "task_deleted",
        entityId: taskId,
        tenantId,
        userId,
        timestamp: Date.now()
      }
      broadcastSyncEvent(event)
    },

    // Project sync events
    onProjectCreated: (project: any) => {
      const event: SyncEvent = {
        type: "project_created",
        entityId: project.id,
        tenantId: project.tenantId,
        userId: project.userId,
        data: project,
        timestamp: Date.now()
      }
      broadcastSyncEvent(event)
    },

    onProjectUpdated: (project: any) => {
      const event: SyncEvent = {
        type: "project_updated",
        entityId: project.id,
        tenantId: project.tenantId,
        userId: project.userId,
        data: project,
        timestamp: Date.now()
      }
      broadcastSyncEvent(event)
    },

    onProjectDeleted: (projectId: string, tenantId: string, userId: string) => {
      const event: SyncEvent = {
        type: "project_deleted",
        entityId: projectId,
        tenantId,
        userId,
        timestamp: Date.now()
      }
      broadcastSyncEvent(event)
    },

    // Context sync events
    onContextCreated: (context: any) => {
      const event: SyncEvent = {
        type: "context_created",
        entityId: context.id,
        tenantId: context.tenantId,
        userId: context.userId,
        data: context,
        timestamp: Date.now()
      }
      broadcastSyncEvent(event)
    },

    onContextUpdated: (context: any) => {
      const event: SyncEvent = {
        type: "context_updated",
        entityId: context.id,
        tenantId: context.tenantId,
        userId: context.userId,
        data: context,
        timestamp: Date.now()
      }
      broadcastSyncEvent(event)
    },

    onContextDeleted: (contextId: string, tenantId: string, userId: string) => {
      const event: SyncEvent = {
        type: "context_deleted",
        entityId: contextId,
        tenantId,
        userId,
        timestamp: Date.now()
      }
      broadcastSyncEvent(event)
    },

    // Area sync events
    onAreaCreated: (area: any) => {
      const event: SyncEvent = {
        type: "area_created",
        entityId: area.id,
        tenantId: area.tenantId,
        userId: area.userId,
        data: area,
        timestamp: Date.now()
      }
      broadcastSyncEvent(event)
    },

    onAreaUpdated: (area: any) => {
      const event: SyncEvent = {
        type: "area_updated",
        entityId: area.id,
        tenantId: area.tenantId,
        userId: area.userId,
        data: area,
        timestamp: Date.now()
      }
      broadcastSyncEvent(event)
    },

    onAreaDeleted: (areaId: string, tenantId: string, userId: string) => {
      const event: SyncEvent = {
        type: "area_deleted",
        entityId: areaId,
        tenantId,
        userId,
        timestamp: Date.now()
      }
      broadcastSyncEvent(event)
    },

    // Inbox sync events
    onInboxCreated: (inboxItem: any) => {
      const event: SyncEvent = {
        type: "inbox_created",
        entityId: inboxItem.id,
        tenantId: inboxItem.tenantId,
        userId: inboxItem.userId,
        data: inboxItem,
        timestamp: Date.now()
      }
      broadcastSyncEvent(event)
    },

    onInboxUpdated: (inboxItem: any) => {
      const event: SyncEvent = {
        type: "inbox_updated",
        entityId: inboxItem.id,
        tenantId: inboxItem.tenantId,
        userId: inboxItem.userId,
        data: inboxItem,
        timestamp: Date.now()
      }
      broadcastSyncEvent(event)
    },

    onInboxDeleted: (inboxItemId: string, tenantId: string, userId: string) => {
      const event: SyncEvent = {
        type: "inbox_deleted",
        entityId: inboxItemId,
        tenantId,
        userId,
        timestamp: Date.now()
      }
      broadcastSyncEvent(event)
    }
  }
}

export const syncMiddleware = createSyncMiddleware()