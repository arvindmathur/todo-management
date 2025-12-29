"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useSession } from "next-auth/react"

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

const CACHE_DURATION = 15000 // 15 seconds cache for counts
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
    const now = Date.now()

    // Check cache first
    const cached = countsCache.get(userId)
    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      if (mountedRef.current) {
        setCounts(cached.data)
        setLoading(false)
        setError(null)
      }
      return cached.data
    }

    // Check if there's already an active request for this user
    const activeRequest = activeCountsRequests.get(userId)
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

        const response = await fetch("/api/tasks/counts", {
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
        
        // Cache the result
        countsCache.set(userId, {
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
        activeCountsRequests.delete(userId)
        if (mountedRef.current) {
          setLoading(false)
        }
      }
    })()

    // Store the active request
    activeCountsRequests.set(userId, requestPromise)

    return await requestPromise
  }, [status, session?.user?.id])

  const refreshCounts = useCallback(async () => {
    if (!session?.user?.id) return

    // Clear cache to force fresh fetch
    countsCache.delete(session.user.id)
    activeCountsRequests.delete(session.user.id)
    
    await fetchCounts()
  }, [session?.user?.id, fetchCounts])

  useEffect(() => {
    fetchCounts()
  }, [fetchCounts])

  return {
    counts,
    loading,
    error,
    refreshCounts,
  }
}