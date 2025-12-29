"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"

export interface UserPreferences {
  completedTaskRetention: 30 | 90 | 365 | -1
  defaultView: "simple" | "gtd"
  theme: "light" | "dark" | "system"
  notifications: {
    email: boolean
    browser: boolean
    weeklyReview: boolean
  }
  gtdOnboardingCompleted?: boolean
  taskDefaults?: {
    priority: "urgent" | "high" | "medium" | "low"
    dueDate: "today" | "tomorrow" | "none"
  }
  taskSorting?: {
    primary: "priority" | "dueDate" | "title" | "created"
    secondary: "priority" | "dueDate" | "title" | "created"
    tertiary: "priority" | "dueDate" | "title" | "created"
  }
}

export interface PreferencesData {
  gtdEnabled: boolean
  preferences: UserPreferences
}

export function useUserPreferences() {
  const { data: session, status } = useSession()
  const [preferencesData, setPreferencesData] = useState<PreferencesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPreferences = useCallback(async () => {
    if (status !== "authenticated") return

    try {
      setLoading(true)
      const response = await fetch("/api/user/preferences")
      
      if (response.ok) {
        const data = await response.json()
        setPreferencesData(data)
        setError(null)
      } else {
        setError("Failed to load preferences")
      }
    } catch (err) {
      setError("Failed to load preferences")
    } finally {
      setLoading(false)
    }
  }, [status])

  const updatePreferences = async (updates: Partial<PreferencesData>) => {
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
        setPreferencesData(data)
        setError(null)
        return { success: true, data }
      } else {
        const errorData = await response.json()
        setError(errorData.error || "Failed to update preferences")
        return { success: false, error: errorData.error }
      }
    } catch (err) {
      const errorMessage = "Failed to update preferences"
      setError(errorMessage)
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