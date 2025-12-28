"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { Context, ContextFilters, CreateContextRequest, UpdateContextRequest } from "@/types/context"

export function useContexts(initialFilters: ContextFilters = {}) {
  const { data: session, status } = useSession()
  const [contexts, setContexts] = useState<Context[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<ContextFilters>(initialFilters)

  const fetchContexts = useCallback(async (currentFilters: ContextFilters = filters) => {
    if (status !== "authenticated") return

    try {
      setLoading(true)
      const searchParams = new URLSearchParams()
      
      Object.entries(currentFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          searchParams.append(key, value.toString())
        }
      })

      const response = await fetch(`/api/contexts?${searchParams.toString()}`)
      
      if (response.ok) {
        const data = await response.json()
        setContexts(data.contexts)
        setError(null)
      } else {
        const errorData = await response.json()
        setError(errorData.error || "Failed to load contexts")
      }
    } catch (err) {
      setError("Failed to load contexts")
    } finally {
      setLoading(false)
    }
  }, [status, filters])

  const createContext = async (contextData: CreateContextRequest) => {
    try {
      const response = await fetch("/api/contexts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(contextData),
      })

      if (response.ok) {
        const data = await response.json()
        setContexts(prev => [data.context, ...prev])
        setError(null)
        return { success: true, context: data.context }
      } else {
        const errorData = await response.json()
        setError(errorData.error || "Failed to create context")
        return { success: false, error: errorData.error }
      }
    } catch (err) {
      const errorMessage = "Failed to create context"
      setError(errorMessage)
      return { success: false, error: errorMessage }
    }
  }

  const updateContext = async (contextId: string, updates: UpdateContextRequest) => {
    try {
      const response = await fetch(`/api/contexts/${contextId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      })

      if (response.ok) {
        const data = await response.json()
        setContexts(prev => prev.map(context => 
          context.id === contextId ? data.context : context
        ))
        setError(null)
        return { success: true, context: data.context }
      } else {
        const errorData = await response.json()
        setError(errorData.error || "Failed to update context")
        return { success: false, error: errorData.error }
      }
    } catch (err) {
      const errorMessage = "Failed to update context"
      setError(errorMessage)
      return { success: false, error: errorMessage }
    }
  }

  const deleteContext = async (contextId: string) => {
    try {
      const response = await fetch(`/api/contexts/${contextId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setContexts(prev => prev.filter(context => context.id !== contextId))
        setError(null)
        return { success: true }
      } else {
        const errorData = await response.json()
        setError(errorData.error || "Failed to delete context")
        return { success: false, error: errorData.error }
      }
    } catch (err) {
      const errorMessage = "Failed to delete context"
      setError(errorMessage)
      return { success: false, error: errorMessage }
    }
  }

  const initializeDefaultContexts = async () => {
    try {
      const response = await fetch("/api/contexts", {
        method: "PUT",
      })

      if (response.ok) {
        const data = await response.json()
        // Refresh contexts list to include new defaults
        await fetchContexts()
        setError(null)
        return { success: true, contexts: data.contexts }
      } else {
        const errorData = await response.json()
        setError(errorData.error || "Failed to initialize default contexts")
        return { success: false, error: errorData.error }
      }
    } catch (err) {
      const errorMessage = "Failed to initialize default contexts"
      setError(errorMessage)
      return { success: false, error: errorMessage }
    }
  }

  const updateFilters = (newFilters: Partial<ContextFilters>) => {
    const updatedFilters = { ...filters, ...newFilters }
    setFilters(updatedFilters)
    fetchContexts(updatedFilters)
  }

  const clearFilters = () => {
    const clearedFilters = {}
    setFilters(clearedFilters)
    fetchContexts(clearedFilters)
  }

  useEffect(() => {
    fetchContexts()
  }, [fetchContexts])

  return {
    contexts,
    loading,
    error,
    filters,
    createContext,
    updateContext,
    deleteContext,
    initializeDefaultContexts,
    updateFilters,
    clearFilters,
    refetch: fetchContexts,
  }
}

// Hook for a single context
export function useContext(contextId: string) {
  const { data: session, status } = useSession()
  const [context, setContext] = useState<Context | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchContext = useCallback(async () => {
    if (status !== "authenticated" || !contextId) return

    try {
      setLoading(true)
      const response = await fetch(`/api/contexts/${contextId}`)
      
      if (response.ok) {
        const data = await response.json()
        setContext(data.context)
        setError(null)
      } else {
        const errorData = await response.json()
        setError(errorData.error || "Failed to load context")
      }
    } catch (err) {
      setError("Failed to load context")
    } finally {
      setLoading(false)
    }
  }, [status, contextId])

  useEffect(() => {
    fetchContext()
  }, [fetchContext])

  return {
    context,
    loading,
    error,
    refetch: fetchContext,
  }
}