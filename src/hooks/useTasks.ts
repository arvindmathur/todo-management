"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useSession } from "next-auth/react"
import { Task, TaskFilters, CreateTaskRequest, UpdateTaskRequest } from "@/types/task"
import { useUserPreferences } from "@/hooks/useUserPreferences"

// Debounce hook for search
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

export function useTasks(initialFilters: TaskFilters = {}) {
  const { data: session, status } = useSession()
  const { preferencesData } = useUserPreferences()
  const [tasks, setTasks] = useState<Task[]>([]) // Initialize with empty array
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<TaskFilters>(initialFilters)

  // Debounce search to avoid too many API calls
  const debouncedFilters = useDebounce(filters, 300)

  const fetchTasks = useCallback(async (currentFilters: TaskFilters = debouncedFilters) => {
    if (status !== "authenticated") return

    try {
      setLoading(true)
      const searchParams = new URLSearchParams()
      
      // Add user preference for completed task visibility
      const completedTaskVisibility = preferencesData?.preferences?.completedTaskVisibility || "none"
      searchParams.append("includeCompleted", completedTaskVisibility)
      
      Object.entries(currentFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "" && key !== "includeCompleted") {
          searchParams.append(key, value.toString())
        }
      })

      const response = await fetch(`/api/tasks?${searchParams.toString()}`)
      
      if (response.ok) {
        const data = await response.json()
        // Handle paginated response structure
        setTasks(data.data || data.tasks || []) // Support both paginated and direct response formats
        setError(null)
      } else {
        const errorData = await response.json()
        setError(errorData.error || "Failed to load tasks")
        setTasks([]) // Set empty array on error
      }
    } catch (err) {
      setError("Failed to load tasks")
      setTasks([]) // Set empty array on error
    } finally {
      setLoading(false)
    }
  }, [status, debouncedFilters, preferencesData?.preferences?.completedTaskVisibility])

  const createTask = async (taskData: CreateTaskRequest) => {
    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(taskData),
      })

      if (response.ok) {
        const data = await response.json()
        setTasks(prev => [data.task, ...prev])
        setError(null)
        return { success: true, task: data.task }
      } else {
        const errorData = await response.json()
        setError(errorData.error || "Failed to create task")
        return { success: false, error: errorData.error }
      }
    } catch (err) {
      const errorMessage = "Failed to create task"
      setError(errorMessage)
      return { success: false, error: errorMessage }
    }
  }

  const updateTask = async (taskId: string, updates: UpdateTaskRequest) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      })

      if (response.ok) {
        const data = await response.json()
        setTasks(prev => prev.map(task => 
          task.id === taskId ? data.task : task
        ))
        setError(null)
        return { success: true, task: data.task }
      } else {
        const errorData = await response.json()
        setError(errorData.error || "Failed to update task")
        return { success: false, error: errorData.error }
      }
    } catch (err) {
      const errorMessage = "Failed to update task"
      setError(errorMessage)
      return { success: false, error: errorMessage }
    }
  }

  const deleteTask = async (taskId: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setTasks(prev => prev.filter(task => task.id !== taskId))
        setError(null)
        return { success: true }
      } else {
        const errorData = await response.json()
        setError(errorData.error || "Failed to delete task")
        return { success: false, error: errorData.error }
      }
    } catch (err) {
      const errorMessage = "Failed to delete task"
      setError(errorMessage)
      return { success: false, error: errorMessage }
    }
  }

  const completeTask = async (taskId: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/complete`, {
        method: "POST",
      })

      if (response.ok) {
        const data = await response.json()
        setTasks(prev => prev.map(task => 
          task.id === taskId ? data.task : task
        ))
        setError(null)
        return { success: true, task: data.task }
      } else {
        const errorData = await response.json()
        setError(errorData.error || "Failed to complete task")
        return { success: false, error: errorData.error }
      }
    } catch (err) {
      const errorMessage = "Failed to complete task"
      setError(errorMessage)
      return { success: false, error: errorMessage }
    }
  }

  const reopenTask = async (taskId: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/complete`, {
        method: "DELETE",
      })

      if (response.ok) {
        const data = await response.json()
        setTasks(prev => prev.map(task => 
          task.id === taskId ? data.task : task
        ))
        setError(null)
        return { success: true, task: data.task }
      } else {
        const errorData = await response.json()
        setError(errorData.error || "Failed to reopen task")
        return { success: false, error: errorData.error }
      }
    } catch (err) {
      const errorMessage = "Failed to reopen task"
      setError(errorMessage)
      return { success: false, error: errorMessage }
    }
  }

  const updateFilters = (newFilters: Partial<TaskFilters>, replace: boolean = false) => {
    const updatedFilters = replace ? newFilters : { ...filters, ...newFilters }
    setFilters(updatedFilters)
    // fetchTasks will be called automatically when debouncedFilters changes
  }

  const clearFilters = () => {
    const clearedFilters = {}
    setFilters(clearedFilters)
    // fetchTasks will be called automatically when debouncedFilters changes
  }

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  // Refetch tasks when completed task visibility preference changes
  useEffect(() => {
    if (status === "authenticated" && preferencesData?.preferences?.completedTaskVisibility !== undefined) {
      fetchTasks()
    }
  }, [preferencesData?.preferences?.completedTaskVisibility, status, fetchTasks])

  return {
    tasks,
    loading,
    error,
    filters,
    createTask,
    updateTask,
    deleteTask,
    completeTask,
    reopenTask,
    updateFilters,
    clearFilters,
    refetch: fetchTasks,
  }
}