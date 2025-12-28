"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { syncClient, SyncState, PendingChange } from "@/lib/sync-client"
import { SyncEvent } from "@/lib/websocket"

export function useSync() {
  const { data: session, status } = useSession()
  const [syncState, setSyncState] = useState<SyncState>(syncClient.getState())
  const [lastSyncEvent, setLastSyncEvent] = useState<SyncEvent | null>(null)

  // Initialize sync client when session is available
  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      // Use session token for authentication
      const sessionToken = (session as any).sessionToken || session.user.email
      syncClient.initialize(sessionToken)
    }
  }, [session, status])

  // Subscribe to sync state changes
  useEffect(() => {
    const unsubscribe = syncClient.onStateChange((state) => {
      setSyncState(state)
    })

    return unsubscribe
  }, [])

  // Subscribe to sync events
  useEffect(() => {
    const unsubscribe = syncClient.onSyncEvent((event) => {
      setLastSyncEvent(event)
    })

    return unsubscribe
  }, [])

  const addPendingChange = useCallback((change: Omit<PendingChange, "id" | "timestamp" | "retryCount">) => {
    syncClient.addPendingChange(change)
  }, [])

  const forceSync = useCallback(() => {
    syncClient.forceSync()
  }, [])

  const getSyncStatus = useCallback(() => {
    if (!syncState.isOnline) {
      return {
        status: "offline" as const,
        message: "You're offline. Changes will sync when you're back online.",
        color: "yellow"
      }
    }

    if (!syncState.isConnected) {
      return {
        status: "disconnected" as const,
        message: "Connecting to sync server...",
        color: "red"
      }
    }

    if (syncState.isSyncing) {
      return {
        status: "syncing" as const,
        message: "Syncing changes...",
        color: "blue"
      }
    }

    if (syncState.pendingChanges.length > 0) {
      return {
        status: "pending" as const,
        message: `${syncState.pendingChanges.length} changes pending sync`,
        color: "orange"
      }
    }

    return {
      status: "synced" as const,
      message: "All changes synced",
      color: "green"
    }
  }, [syncState])

  return {
    syncState,
    lastSyncEvent,
    addPendingChange,
    forceSync,
    getSyncStatus,
    isOnline: syncState.isOnline,
    isConnected: syncState.isConnected,
    isSyncing: syncState.isSyncing,
    pendingChanges: syncState.pendingChanges.length,
    lastSync: syncState.lastSyncTimestamp
  }
}

// Hook for automatic sync on data mutations
export function useAutoSync() {
  const { addPendingChange } = useSync()

  const syncCreate = useCallback((entity: "task" | "project" | "context" | "area" | "inbox", data: any) => {
    addPendingChange({
      type: "create",
      entity,
      entityId: data.id,
      data
    })
  }, [addPendingChange])

  const syncUpdate = useCallback((entity: "task" | "project" | "context" | "area" | "inbox", entityId: string, data: any) => {
    addPendingChange({
      type: "update",
      entity,
      entityId,
      data
    })
  }, [addPendingChange])

  const syncDelete = useCallback((entity: "task" | "project" | "context" | "area" | "inbox", entityId: string) => {
    addPendingChange({
      type: "delete",
      entity,
      entityId,
      data: null
    })
  }, [addPendingChange])

  return {
    syncCreate,
    syncUpdate,
    syncDelete
  }
}