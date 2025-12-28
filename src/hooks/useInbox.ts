"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { 
  InboxItem, 
  InboxFilters, 
  CreateInboxItemRequest, 
  UpdateInboxItemRequest, 
  ProcessInboxItemRequest,
  InboxCountResponse 
} from "@/types/inbox"

export function useInbox(initialFilters: InboxFilters = {}) {
  const { data: session, status } = useSession()
  const [inboxItems, setInboxItems] = useState<InboxItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<InboxFilters>(initialFilters)
  const [unprocessedCount, setUnprocessedCount] = useState(0)

  const fetchInboxItems = useCallback(async (currentFilters: InboxFilters = filters) => {
    if (status !== "authenticated") return

    try {
      setLoading(true)
      const searchParams = new URLSearchParams()
      
      Object.entries(currentFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          searchParams.append(key, value.toString())
        }
      })

      const response = await fetch(`/api/inbox?${searchParams.toString()}`)
      
      if (response.ok) {
        const data = await response.json()
        setInboxItems(data.inboxItems)
        setUnprocessedCount(data.unprocessedCount)
        setError(null)
      } else {
        const errorData = await response.json()
        setError(errorData.error || "Failed to load inbox items")
      }
    } catch (err) {
      setError("Failed to load inbox items")
    } finally {
      setLoading(false)
    }
  }, [status, filters])

  const addToInbox = async (itemData: CreateInboxItemRequest) => {
    try {
      const response = await fetch("/api/inbox", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(itemData),
      })

      if (response.ok) {
        const data = await response.json()
        setInboxItems(prev => [data.inboxItem, ...prev])
        setUnprocessedCount(data.unprocessedCount)
        setError(null)
        return { success: true, inboxItem: data.inboxItem }
      } else {
        const errorData = await response.json()
        setError(errorData.error || "Failed to add item to inbox")
        return { success: false, error: errorData.error }
      }
    } catch (err) {
      const errorMessage = "Failed to add item to inbox"
      setError(errorMessage)
      return { success: false, error: errorMessage }
    }
  }

  const updateInboxItem = async (itemId: string, updates: UpdateInboxItemRequest) => {
    try {
      const response = await fetch(`/api/inbox/${itemId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      })

      if (response.ok) {
        const data = await response.json()
        setInboxItems(prev => prev.map(item => 
          item.id === itemId ? data.inboxItem : item
        ))
        setError(null)
        return { success: true, inboxItem: data.inboxItem }
      } else {
        const errorData = await response.json()
        setError(errorData.error || "Failed to update inbox item")
        return { success: false, error: errorData.error }
      }
    } catch (err) {
      const errorMessage = "Failed to update inbox item"
      setError(errorMessage)
      return { success: false, error: errorMessage }
    }
  }

  const deleteInboxItem = async (itemId: string) => {
    try {
      const response = await fetch(`/api/inbox/${itemId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        const data = await response.json()
        setInboxItems(prev => prev.filter(item => item.id !== itemId))
        setUnprocessedCount(data.unprocessedCount)
        setError(null)
        return { success: true }
      } else {
        const errorData = await response.json()
        setError(errorData.error || "Failed to delete inbox item")
        return { success: false, error: errorData.error }
      }
    } catch (err) {
      const errorMessage = "Failed to delete inbox item"
      setError(errorMessage)
      return { success: false, error: errorMessage }
    }
  }

  const processInboxItem = async (itemId: string, processData: ProcessInboxItemRequest) => {
    try {
      const response = await fetch(`/api/inbox/${itemId}/process`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(processData),
      })

      if (response.ok) {
        const data = await response.json()
        
        // Update the inbox items list
        if (processData.action === "delete") {
          setInboxItems(prev => prev.filter(item => item.id !== itemId))
        } else {
          setInboxItems(prev => prev.map(item => 
            item.id === itemId ? { ...item, processed: true, processedAt: new Date() } : item
          ))
        }
        
        setUnprocessedCount(data.unprocessedCount)
        setError(null)
        return { success: true, result: data.result, action: data.action }
      } else {
        const errorData = await response.json()
        setError(errorData.error || "Failed to process inbox item")
        return { success: false, error: errorData.error }
      }
    } catch (err) {
      const errorMessage = "Failed to process inbox item"
      setError(errorMessage)
      return { success: false, error: errorMessage }
    }
  }

  const updateFilters = (newFilters: Partial<InboxFilters>) => {
    const updatedFilters = { ...filters, ...newFilters }
    setFilters(updatedFilters)
    fetchInboxItems(updatedFilters)
  }

  const clearFilters = () => {
    const clearedFilters = {}
    setFilters(clearedFilters)
    fetchInboxItems(clearedFilters)
  }

  useEffect(() => {
    fetchInboxItems()
  }, [fetchInboxItems])

  return {
    inboxItems,
    loading,
    error,
    filters,
    unprocessedCount,
    addToInbox,
    updateInboxItem,
    deleteInboxItem,
    processInboxItem,
    updateFilters,
    clearFilters,
    refetch: fetchInboxItems,
  }
}

// Hook for inbox count only (for displaying counter)
export function useInboxCount() {
  const { data: session, status } = useSession()
  const [count, setCount] = useState<InboxCountResponse>({
    unprocessedCount: 0,
    processedCount: 0,
    totalCount: 0,
    processingRate: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCount = useCallback(async () => {
    if (status !== "authenticated") return

    try {
      setLoading(true)
      const response = await fetch("/api/inbox/count")
      
      if (response.ok) {
        const data = await response.json()
        setCount(data)
        setError(null)
      } else {
        const errorData = await response.json()
        setError(errorData.error || "Failed to load inbox count")
      }
    } catch (err) {
      setError("Failed to load inbox count")
    } finally {
      setLoading(false)
    }
  }, [status])

  useEffect(() => {
    fetchCount()
    
    // Refresh count every 30 seconds
    const interval = setInterval(fetchCount, 30000)
    return () => clearInterval(interval)
  }, [fetchCount])

  return {
    count,
    loading,
    error,
    refetch: fetchCount,
  }
}

// Hook for a single inbox item
export function useInboxItem(itemId: string) {
  const { data: session, status } = useSession()
  const [inboxItem, setInboxItem] = useState<InboxItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchInboxItem = useCallback(async () => {
    if (status !== "authenticated" || !itemId) return

    try {
      setLoading(true)
      const response = await fetch(`/api/inbox/${itemId}`)
      
      if (response.ok) {
        const data = await response.json()
        setInboxItem(data.inboxItem)
        setError(null)
      } else {
        const errorData = await response.json()
        setError(errorData.error || "Failed to load inbox item")
      }
    } catch (err) {
      setError("Failed to load inbox item")
    } finally {
      setLoading(false)
    }
  }, [status, itemId])

  useEffect(() => {
    fetchInboxItem()
  }, [fetchInboxItem])

  return {
    inboxItem,
    loading,
    error,
    refetch: fetchInboxItem,
  }
}