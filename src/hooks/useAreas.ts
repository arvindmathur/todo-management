"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { Area, AreaFilters, CreateAreaRequest, UpdateAreaRequest } from "@/types/area"

export function useAreas(initialFilters: AreaFilters = {}) {
  const { data: session, status } = useSession()
  const [areas, setAreas] = useState<Area[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<AreaFilters>(initialFilters)

  const fetchAreas = useCallback(async (currentFilters: AreaFilters = filters) => {
    if (status !== "authenticated") return

    try {
      setLoading(true)
      const searchParams = new URLSearchParams()
      
      Object.entries(currentFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          searchParams.append(key, value.toString())
        }
      })

      const response = await fetch(`/api/areas?${searchParams.toString()}`)
      
      if (response.ok) {
        const data = await response.json()
        setAreas(data.areas)
        setError(null)
      } else {
        const errorData = await response.json()
        setError(errorData.error || "Failed to load areas")
      }
    } catch (err) {
      setError("Failed to load areas")
    } finally {
      setLoading(false)
    }
  }, [status, filters])

  const createArea = async (areaData: CreateAreaRequest) => {
    try {
      const response = await fetch("/api/areas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(areaData),
      })

      if (response.ok) {
        const data = await response.json()
        setAreas(prev => [data.area, ...prev])
        setError(null)
        return { success: true, area: data.area }
      } else {
        const errorData = await response.json()
        setError(errorData.error || "Failed to create area")
        return { success: false, error: errorData.error }
      }
    } catch (err) {
      const errorMessage = "Failed to create area"
      setError(errorMessage)
      return { success: false, error: errorMessage }
    }
  }

  const updateArea = async (areaId: string, updates: UpdateAreaRequest) => {
    try {
      const response = await fetch(`/api/areas/${areaId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      })

      if (response.ok) {
        const data = await response.json()
        setAreas(prev => prev.map(area => 
          area.id === areaId ? data.area : area
        ))
        setError(null)
        return { success: true, area: data.area }
      } else {
        const errorData = await response.json()
        setError(errorData.error || "Failed to update area")
        return { success: false, error: errorData.error }
      }
    } catch (err) {
      const errorMessage = "Failed to update area"
      setError(errorMessage)
      return { success: false, error: errorMessage }
    }
  }

  const deleteArea = async (areaId: string) => {
    try {
      const response = await fetch(`/api/areas/${areaId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setAreas(prev => prev.filter(area => area.id !== areaId))
        setError(null)
        return { success: true }
      } else {
        const errorData = await response.json()
        setError(errorData.error || "Failed to delete area")
        return { success: false, error: errorData.error }
      }
    } catch (err) {
      const errorMessage = "Failed to delete area"
      setError(errorMessage)
      return { success: false, error: errorMessage }
    }
  }

  const updateFilters = (newFilters: Partial<AreaFilters>) => {
    const updatedFilters = { ...filters, ...newFilters }
    setFilters(updatedFilters)
    fetchAreas(updatedFilters)
  }

  const clearFilters = () => {
    const clearedFilters = {}
    setFilters(clearedFilters)
    fetchAreas(clearedFilters)
  }

  useEffect(() => {
    fetchAreas()
  }, [fetchAreas])

  return {
    areas,
    loading,
    error,
    filters,
    createArea,
    updateArea,
    deleteArea,
    updateFilters,
    clearFilters,
    refetch: fetchAreas,
  }
}

// Hook for a single area
export function useArea(areaId: string) {
  const { data: session, status } = useSession()
  const [area, setArea] = useState<Area | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchArea = useCallback(async () => {
    if (status !== "authenticated" || !areaId) return

    try {
      setLoading(true)
      const response = await fetch(`/api/areas/${areaId}`)
      
      if (response.ok) {
        const data = await response.json()
        setArea(data.area)
        setError(null)
      } else {
        const errorData = await response.json()
        setError(errorData.error || "Failed to load area")
      }
    } catch (err) {
      setError("Failed to load area")
    } finally {
      setLoading(false)
    }
  }, [status, areaId])

  useEffect(() => {
    fetchArea()
  }, [fetchArea])

  return {
    area,
    loading,
    error,
    refetch: fetchArea,
  }
}