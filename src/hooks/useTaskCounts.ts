"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useSession } from "next-auth/react"
import { useUserPreferences } from "@/hooks/useUserPreferences"

export interface TaskCounts {
  all: number
  today: number
  overdue: number
  upcoming: number
  noDueDate: number
  focus: number
}

// Global cache to prevent multiple requests
const countsCache = new Map<string, {
  data: TaskCounts
  timestamp: number
}>()

// Global request deduplication
const activeCountsRequests = new Map<string, Promise<TaskCounts>>()

const CACHE_DURATION = 10000 // 10 seconds cache for counts
const DEFAULT_COUNTS: TaskCounts = {
  all: 0,
  today: 0,
  overdue: 0,
  upcoming: 0,
  noDueDate: 0,
  focus: 0,
}

export function useTaskCounts() {
  const { data: session, status } = useSession()
  const { preferencesData } = useUserPreferences()
  const [counts, setCounts] = useState<TaskCounts>(DEFAULT_COUNTS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const fetchCounts = useCallback(async (): Promise<TaskCounts> => {
    if (status !== "authenticated" || !session?.user?.id) {
      return DEFAULT_COUNTS
    }

    const userId = session.user.id
    const completedTaskVisibility = preferencesData?.preferences?.completedTaskVisibility || "none"
    const now = Date.now()

    // Include completed task preference in cache key
    const cacheKey = `${userId}:${completedTaskVisibility}`

    // Check cache first
    const cached = countsCache.get(cacheKey)
    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      if (mountedRef.current) {
        setCounts(cached.data)
        setLoading(false)
        setError(null)
      }
      return cached.data
    }

    // Check if there's already an active request for this user+preference combo
    const activeRequest = activeCountsRequests.get(cacheKey)
    if (activeRequest) {
      try {
        const data = await activeRequest
        if (mountedRef.current) {
          setCounts(data)
          setLoading(false)
          setError(null)
        }
        return data
      } catch (err) {
        if (mountedRef.current) {
          setError("Failed to load task counts")
          setLoading(false)
        }
        return DEFAULT_COUNTS
      }
    }

    // Create new request with deduplication
    const requestPromise = (async (): Promise<TaskCounts> => {
      try {
        if (mountedRef.current) {
          setLoading(true)
        }

        // Add includeCompleted parameter to the request
        const searchParams = new URLSearchParams()
        searchParams.append("includeCompleted", completedTaskVisibility)

        const response = await fetch(`/api/tasks/counts?${searchParams.toString()}`, {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        })
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const result = await response.json()
        const countsData = result.counts || DEFAULT_COUNTS
        
        // Cache the result with the preference-specific key
        countsCache.set(cacheKey, {
          data: countsData,
          timestamp: now
        })

        if (mountedRef.current) {
          setCounts(countsData)
          setError(null)
        }

        return countsData
      } catch (err) {
        console.error('Failed to fetch task counts:', err)
        if (mountedRef.current) {
          setError("Failed to load task counts")
          setCounts(DEFAULT_COUNTS)
        }
        return DEFAULT_COUNTS
      } finally {
        // Clean up active request
        activeCountsRequests.delete(cacheKey)
        if (mountedRef.current) {
          setLoading(false)
        }
      }
    })()

    // Store the active request
    activeCountsRequests.set(cacheKey, requestPromise)

    return await requestPromise
  }, [status, session?.user?.id, preferencesData?.preferences?.completedTaskVisibility])

  const refreshCounts = useCallback(async () => {
    if (!session?.user?.id) return

    const completedTaskVisibility = preferencesData?.preferences?.completedTaskVisibility || "none"
    const cacheKey = `${session.user.id}:${completedTaskVisibility}`

    // Clear cache to force fresh fetch
    countsCache.delete(cacheKey)
    activeCountsRequests.delete(cacheKey)
    
    await fetchCounts()
  }, [session?.user?.id, preferencesData?.preferences?.completedTaskVisibility, fetchCounts])

  useEffect(() => {
    fetchCounts()
  }, [fetchCounts])

  // Refetch counts when completed task visibility preference changes
  useEffect(() => {
    if (status === "authenticated" && preferencesData?.preferences?.completedTaskVisibility !== undefined) {
      fetchCounts()
    }
  }, [preferencesData?.preferences?.completedTaskVisibility, status, fetchCounts])

  return {
    counts,
    loading,
    error,
    refreshCounts,
  }
}