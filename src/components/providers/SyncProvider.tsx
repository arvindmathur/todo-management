"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { useSession } from "next-auth/react"
import { syncClient, SyncState } from "@/lib/sync-client"
import { offlineStorage } from "@/lib/offline-storage"
import { SyncStatusBanner } from "@/components/sync/SyncStatusIndicator"

interface SyncContextType {
  syncState: SyncState
  isInitialized: boolean
  forceSync: () => void
  clearOfflineData: () => Promise<void>
}

const SyncContext = createContext<SyncContextType | null>(null)

interface SyncProviderProps {
  children: ReactNode
}

export function SyncProvider({ children }: SyncProviderProps) {
  const { data: session, status } = useSession()
  const [syncState, setSyncState] = useState<SyncState>(syncClient.getState())
  const [isInitialized, setIsInitialized] = useState(false)

  // Initialize offline storage and sync client
  useEffect(() => {
    const initialize = async () => {
      try {
        // Initialize offline storage
        await offlineStorage.initialize()
        
        // Initialize sync client if authenticated
        if (status === "authenticated" && session?.user) {
          const sessionToken = (session as any).sessionToken || session.user.email
          syncClient.initialize(sessionToken)
        }
        
        setIsInitialized(true)
      } catch (error) {
        console.error("Failed to initialize sync:", error)
        setIsInitialized(true) // Still mark as initialized to prevent blocking
      }
    }

    initialize()
  }, [session, status])

  // Subscribe to sync state changes
  useEffect(() => {
    const unsubscribe = syncClient.onStateChange((state) => {
      setSyncState(state)
    })

    return unsubscribe
  }, [])

  // Handle sync events and update offline storage
  useEffect(() => {
    if (!session?.user?.id) return

    const unsubscribe = syncClient.onSyncEvent(async (event) => {
      try {
        // Update offline storage based on sync events
        switch (event.type) {
          case "task_created":
          case "task_updated":
            if (event.data) {
              await offlineStorage.store("tasks", event.data)
            }
            break
          case "task_deleted":
            await offlineStorage.delete("tasks", event.entityId)
            break
          case "project_created":
          case "project_updated":
            if (event.data) {
              await offlineStorage.store("projects", event.data)
            }
            break
          case "project_deleted":
            await offlineStorage.delete("projects", event.entityId)
            break
          case "context_created":
          case "context_updated":
            if (event.data) {
              await offlineStorage.store("contexts", event.data)
            }
            break
          case "context_deleted":
            await offlineStorage.delete("contexts", event.entityId)
            break
          case "area_created":
          case "area_updated":
            if (event.data) {
              await offlineStorage.store("areas", event.data)
            }
            break
          case "area_deleted":
            await offlineStorage.delete("areas", event.entityId)
            break
          case "inbox_created":
          case "inbox_updated":
            if (event.data) {
              await offlineStorage.store("inboxItems", event.data)
            }
            break
          case "inbox_deleted":
            await offlineStorage.delete("inboxItems", event.entityId)
            break
        }
      } catch (error) {
        console.error("Failed to update offline storage:", error)
      }
    })

    return unsubscribe
  }, [session?.user?.id])

  // Cleanup offline data periodically
  useEffect(() => {
    const cleanup = async () => {
      try {
        await offlineStorage.cleanup()
      } catch (error) {
        console.error("Failed to cleanup offline data:", error)
      }
    }

    // Cleanup on mount and then every 24 hours
    cleanup()
    const interval = setInterval(cleanup, 24 * 60 * 60 * 1000)

    return () => clearInterval(interval)
  }, [])

  const forceSync = () => {
    syncClient.forceSync()
  }

  const clearOfflineData = async () => {
    try {
      const stores = ["tasks", "projects", "contexts", "areas", "inboxItems", "metadata"]
      for (const store of stores) {
        await offlineStorage.clear(store)
      }
      console.log("Offline data cleared")
    } catch (error) {
      console.error("Failed to clear offline data:", error)
      throw error
    }
  }

  const contextValue: SyncContextType = {
    syncState,
    isInitialized,
    forceSync,
    clearOfflineData
  }

  return (
    <SyncContext.Provider value={contextValue}>
      <SyncStatusBanner />
      {children}
    </SyncContext.Provider>
  )
}

export function useSync() {
  const context = useContext(SyncContext)
  if (!context) {
    throw new Error("useSync must be used within a SyncProvider")
  }
  return context
}

// Hook for offline-first data access
export function useOfflineData() {
  const { data: session } = useSession()
  const { isInitialized } = useSync()

  const getOfflineTasks = async () => {
    if (!session?.user?.id || !isInitialized) return []
    try {
      return await offlineStorage.getTasks(session.user.id)
    } catch (error) {
      console.error("Failed to get offline tasks:", error)
      return []
    }
  }

  const getOfflineProjects = async () => {
    if (!session?.user?.id || !isInitialized) return []
    try {
      return await offlineStorage.getProjects(session.user.id)
    } catch (error) {
      console.error("Failed to get offline projects:", error)
      return []
    }
  }

  const getOfflineContexts = async () => {
    if (!session?.user?.id || !isInitialized) return []
    try {
      return await offlineStorage.getContexts(session.user.id)
    } catch (error) {
      console.error("Failed to get offline contexts:", error)
      return []
    }
  }

  const getOfflineAreas = async () => {
    if (!session?.user?.id || !isInitialized) return []
    try {
      return await offlineStorage.getAreas(session.user.id)
    } catch (error) {
      console.error("Failed to get offline areas:", error)
      return []
    }
  }

  const getOfflineInboxItems = async () => {
    if (!session?.user?.id || !isInitialized) return []
    try {
      return await offlineStorage.getInboxItems(session.user.id)
    } catch (error) {
      console.error("Failed to get offline inbox items:", error)
      return []
    }
  }

  return {
    getOfflineTasks,
    getOfflineProjects,
    getOfflineContexts,
    getOfflineAreas,
    getOfflineInboxItems,
    isInitialized
  }
}