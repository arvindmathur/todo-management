"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { 
  CompletedTask, 
  CompletedTasksResponse, 
  CompletedTaskStats, 
  CompletedTaskFilters,
  BulkDeleteRequest,
  BulkDeleteResponse
} from "@/types/completedTask"

export function useCompletedTasks(initialFilters: CompletedTaskFilters = {}) {
  const { data: session, status } = useSession()
  const [tasks, setTasks] = useState<CompletedTask[]>([])
  const [pagination, setPagination] = useState<CompletedTasksResponse["pagination"] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<CompletedTaskFilters>(initialFilters)

  const fetchCompletedTasks = useCallback(async (newFilters?: CompletedTaskFilters) => {
    if (status !== "authenticated") return

    try {
      setLoading(true)
      const currentFilters = newFilters || filters
      
      const params = new URLSearchParams()
      Object.entries(currentFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params.append(key, value.toString())
        }
      })

      const response = await fetch(`/api/tasks/completed?${params.toString()}`)
      
      if (response.ok) {
        const data: CompletedTasksResponse = await response.json()
        setTasks(data.tasks)
        setPagination(data.pagination)
        setError(null)
      } else {
        const errorData = await response.json()
        setError(errorData.error || "Failed to load completed tasks")
      }
    } catch (err) {
      setError("Failed to load completed tasks")
    } finally {
      setLoading(false)
    }
  }, [status, filters])

  const updateFilters = useCallback((newFilters: Partial<CompletedTaskFilters>) => {
    const updatedFilters = { ...filters, ...newFilters, page: 1 } // Reset to page 1 when filters change
    setFilters(updatedFilters)
    fetchCompletedTasks(updatedFilters)
  }, [filters, fetchCompletedTasks])

  const changePage = useCallback((page: number) => {
    const updatedFilters = { ...filters, page }
    setFilters(updatedFilters)
    fetchCompletedTasks(updatedFilters)
  }, [filters, fetchCompletedTasks])

  const bulkDeleteTasks = async (deleteRequest: BulkDeleteRequest): Promise<BulkDeleteResponse> => {
    try {
      const response = await fetch("/api/tasks/completed/delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(deleteRequest),
      })

      if (response.ok) {
        const result: BulkDeleteResponse = await response.json()
        // Refresh the task list after deletion
        await fetchCompletedTasks()
        return result
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to delete tasks")
      }
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : "Failed to delete tasks")
    }
  }

  const reopenTask = async (taskId: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/complete`, {
        method: "DELETE",
      })

      if (response.ok) {
        // Remove the task from the completed tasks list
        setTasks(prev => prev.filter(task => task.id !== taskId))
        return { success: true }
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to reopen task")
      }
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : "Failed to reopen task")
    }
  }

  useEffect(() => {
    fetchCompletedTasks()
  }, [fetchCompletedTasks])

  return {
    tasks,
    pagination,
    loading,
    error,
    filters,
    updateFilters,
    changePage,
    bulkDeleteTasks,
    reopenTask,
    refetch: fetchCompletedTasks,
  }
}

export function useCompletedTaskStats() {
  const { data: session, status } = useSession()
  const [stats, setStats] = useState<CompletedTaskStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    if (status !== "authenticated") return

    try {
      setLoading(true)
      const response = await fetch("/api/tasks/completed/stats")
      
      if (response.ok) {
        const data: CompletedTaskStats = await response.json()
        setStats(data)
        setError(null)
      } else {
        const errorData = await response.json()
        setError(errorData.error || "Failed to load completed task stats")
      }
    } catch (err) {
      setError("Failed to load completed task stats")
    } finally {
      setLoading(false)
    }
  }, [status])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return {
    stats,
    loading,
    error,
    refetch: fetchStats,
  }
}