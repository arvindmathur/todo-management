"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { Task } from "@/types/task"

export function useTaskViews() {
  const { data: session, status } = useSession()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTaskView = useCallback(async (endpoint: string) => {
    if (status !== "authenticated") return []

    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/tasks/${endpoint}`)
      
      if (response.ok) {
        const data = await response.json()
        return data.tasks || []
      } else {
        const errorData = await response.json()
        setError(errorData.error || `Failed to load ${endpoint} tasks`)
        return []
      }
    } catch (err) {
      setError(`Failed to load ${endpoint} tasks`)
      return []
    } finally {
      setLoading(false)
    }
  }, [status])

  const getTodayTasks = useCallback(() => {
    return fetchTaskView("today")
  }, [fetchTaskView])

  const getOverdueTasks = useCallback(() => {
    return fetchTaskView("overdue")
  }, [fetchTaskView])

  const getUpcomingTasks = useCallback((days: number = 7) => {
    return fetchTaskView(`upcoming?days=${days}`)
  }, [fetchTaskView])

  const searchTasks = useCallback(async (query: string, limit?: number) => {
    if (status !== "authenticated" || !query.trim()) return []

    try {
      setLoading(true)
      setError(null)
      
      const searchParams = new URLSearchParams({ q: query })
      if (limit) searchParams.append("limit", limit.toString())
      
      const response = await fetch(`/api/tasks/search?${searchParams.toString()}`)
      
      if (response.ok) {
        const data = await response.json()
        return data.tasks || []
      } else {
        const errorData = await response.json()
        setError(errorData.error || "Failed to search tasks")
        return []
      }
    } catch (err) {
      setError("Failed to search tasks")
      return []
    } finally {
      setLoading(false)
    }
  }, [status])

  return {
    loading,
    error,
    getTodayTasks,
    getOverdueTasks,
    getUpcomingTasks,
    searchTasks,
  }
}

// Hook for a specific task view with state management
export function useTaskView(viewType: "today" | "overdue" | "upcoming", upcomingDays?: number) {
  const { getTodayTasks, getOverdueTasks, getUpcomingTasks, loading, error } = useTaskViews()
  const [tasks, setTasks] = useState<Task[]>([])

  const fetchTasks = useCallback(async () => {
    let result: Task[] = []
    
    switch (viewType) {
      case "today":
        result = await getTodayTasks()
        break
      case "overdue":
        result = await getOverdueTasks()
        break
      case "upcoming":
        result = await getUpcomingTasks(upcomingDays)
        break
    }
    
    setTasks(result)
  }, [viewType, upcomingDays, getTodayTasks, getOverdueTasks, getUpcomingTasks])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  return {
    tasks,
    loading,
    error,
    refetch: fetchTasks,
  }
}

// Hook for search with debouncing
export function useTaskSearch(initialQuery: string = "", debounceMs: number = 300) {
  const { searchTasks, loading, error } = useTaskViews()
  const [query, setQuery] = useState(initialQuery)
  const [tasks, setTasks] = useState<Task[]>([])
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery)

  // Debounce the search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
    }, debounceMs)

    return () => clearTimeout(timer)
  }, [query, debounceMs])

  // Perform search when debounced query changes
  useEffect(() => {
    if (debouncedQuery.trim()) {
      searchTasks(debouncedQuery).then(setTasks)
    } else {
      setTasks([])
    }
  }, [debouncedQuery, searchTasks])

  return {
    query,
    setQuery,
    tasks,
    loading,
    error,
    hasQuery: debouncedQuery.trim().length > 0,
  }
}