"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useSession } from "next-auth/react"

export interface UserPreferences {
  completedTaskRetention: 30 | 90 | 365 | -1
  completedTaskVisibility: "none" | "1day" | "7days" | "30days"
  defaultView: "simple" | "gtd"
  theme: "light" | "dark" | "system"
  notifications: {
    email: boolean
    browser: boolean
    weeklyReview: boolean
  }
  emailNotifications?: {
    summaryEnabled: boolean
    summaryFrequency: "daily" | "weekly"
    remindersEnabled: boolean
    defaultReminderDays: number // 1-30 days before due date
  }
  gtdOnboardingCompleted?: boolean
  taskDefaults?: {
    priority: "urgent" | "high" | "medium" | "low"
    dueDate: "today" | "tomorrow" | "none"
  }
  taskSorting?: {
    primary: "priority" | "dueDate" | "title" | "created"
    primaryOrder: "asc" | "desc"
    secondary: "priority" | "dueDate" | "title" | "created"
    secondaryOrder: "asc" | "desc"
    tertiary: "priority" | "dueDate" | "title" | "created"
    tertiaryOrder: "asc" | "desc"
  }
  timezone?: string
  dateFormat?: "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD"
  timeFormat?: "12h" | "24h"
}

export interface PreferencesData {
  gtdEnabled: boolean
  preferences: UserPreferences
}

// Global cache to prevent multiple requests for the same user
const preferencesCache = new Map<string, {
  data: PreferencesData
  timestamp: number
  promise?: Promise<PreferencesData>
}>()

const CACHE_DURATION = 30000 // 30 seconds

// Global request deduplication
const activeRequests = new Map<string, Promise<PreferencesData>>()

export function useUserPreferences() {
  const { data: session, status } = useSession()
  const [preferencesData, setPreferencesData] = useState<PreferencesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const fetchPreferences = useCallback(async (): Promise<PreferencesData | null> => {
    if (status !== "authenticated" || !session?.user?.id) return null

    const userId = session.user.id
    const now = Date.now()

    // Check cache first
    const cached = preferencesCache.get(userId)
    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      if (mountedRef.current) {
        setPreferencesData(cached.data)
        setLoading(false)
        setError(null)
      }
      return cached.data
    }

    // Check if there's already an active request for this user
    const activeRequest = activeRequests.get(userId)
    if (activeRequest) {
      try {
        const data = await activeRequest
        if (mountedRef.current) {
          setPreferencesData(data)
          setLoading(false)
          setError(null)
        }
        return data
      } catch (err) {
        if (mountedRef.current) {
          setError("Failed to load preferences")
          setLoading(false)
        }
        return null
      }
    }

    // Create new request with deduplication
    const requestPromise = (async (): Promise<PreferencesData> => {
      try {
        if (mountedRef.current) {
          setLoading(true)
        }

        const response = await fetch("/api/user/preferences", {
          // Add cache headers to prevent browser caching issues
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        })
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const data = await response.json()
        
        // Cache the result
        preferencesCache.set(userId, {
          data,
          timestamp: now
        })

        if (mountedRef.current) {
          setPreferencesData(data)
          setError(null)
        }

        return data
      } catch (err) {
        console.error('Failed to fetch preferences:', err)
        if (mountedRef.current) {
          setError("Failed to load preferences")
        }
        throw err
      } finally {
        // Clean up active request
        activeRequests.delete(userId)
        if (mountedRef.current) {
          setLoading(false)
        }
      }
    })()

    // Store the active request
    activeRequests.set(userId, requestPromise)

    try {
      return await requestPromise
    } catch (err) {
      return null
    }
  }, [status, session?.user?.id])

  const updatePreferences = async (updates: Partial<UserPreferences & { gtdEnabled?: boolean }>) => {
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" }
    }

    try {
      const response = await fetch("/api/user/preferences", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      })

      if (response.ok) {
        const data = await response.json()
        const newData = {
          gtdEnabled: data.gtdEnabled,
          preferences: data.preferences
        }

        // Update cache
        preferencesCache.set(session.user.id, {
          data: newData,
          timestamp: Date.now()
        })

        // Update local state
        if (mountedRef.current) {
          setPreferencesData(newData)
          setError(null)
        }

        return { success: true, data }
      } else {
        const errorData = await response.json()
        const errorMessage = errorData.error || "Failed to update preferences"
        if (mountedRef.current) {
          setError(errorMessage)
        }
        return { success: false, error: errorMessage }
      }
    } catch (err) {
      const errorMessage = "Failed to update preferences"
      if (mountedRef.current) {
        setError(errorMessage)
      }
      return { success: false, error: errorMessage }
    }
  }

  useEffect(() => {
    fetchPreferences()
  }, [fetchPreferences])

  return {
    preferencesData,
    loading,
    error,
    updatePreferences,
    refetch: fetchPreferences,
  }
}