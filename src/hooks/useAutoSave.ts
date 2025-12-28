"use client"

import { useEffect, useRef, useCallback } from "react"
import { useAutoSync } from "./useSync"

interface AutoSaveOptions {
  delay?: number // Delay in milliseconds before saving
  enabled?: boolean // Whether auto-save is enabled
}

export function useAutoSave<T>(
  data: T,
  saveFunction: (data: T) => Promise<void>,
  options: AutoSaveOptions = {}
) {
  const { delay = 2000, enabled = true } = options
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const previousDataRef = useRef<T>(data)
  const isSavingRef = useRef(false)

  const save = useCallback(async (dataToSave: T) => {
    if (isSavingRef.current) return

    try {
      isSavingRef.current = true
      await saveFunction(dataToSave)
      previousDataRef.current = dataToSave
    } catch (error) {
      console.error("Auto-save failed:", error)
    } finally {
      isSavingRef.current = false
    }
  }, [saveFunction])

  useEffect(() => {
    if (!enabled) return

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Check if data has changed
    const hasChanged = JSON.stringify(data) !== JSON.stringify(previousDataRef.current)
    
    if (hasChanged && !isSavingRef.current) {
      // Set new timeout for auto-save
      timeoutRef.current = setTimeout(() => {
        save(data)
      }, delay)
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [data, delay, enabled, save])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const forceSave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    save(data)
  }, [data, save])

  return {
    forceSave,
    isSaving: isSavingRef.current
  }
}

// Hook for auto-saving form data with sync integration
export function useAutoSaveForm<T extends { id?: string }>(
  entity: "task" | "project" | "context" | "area" | "inbox",
  data: T,
  options: AutoSaveOptions = {}
) {
  const { syncUpdate, syncCreate } = useAutoSync()

  const saveFunction = useCallback(async (formData: T) => {
    if (formData.id) {
      // Update existing entity
      const response = await fetch(`/api/${entity}s/${formData.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error(`Failed to update ${entity}`)
      }

      const result = await response.json()
      syncUpdate(entity, formData.id, result[entity] || result)
    } else {
      // Create new entity
      const response = await fetch(`/api/${entity}s`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error(`Failed to create ${entity}`)
      }

      const result = await response.json()
      syncCreate(entity, result[entity] || result)
    }
  }, [entity, syncUpdate, syncCreate])

  return useAutoSave(data, saveFunction, options)
}

// Hook for debounced auto-save (useful for text inputs)
export function useDebouncedAutoSave<T>(
  data: T,
  saveFunction: (data: T) => Promise<void>,
  delay: number = 1000
) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const previousDataRef = useRef<T>(data)

  const debouncedSave = useCallback((dataToSave: T) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(async () => {
      try {
        await saveFunction(dataToSave)
        previousDataRef.current = dataToSave
      } catch (error) {
        console.error("Debounced save failed:", error)
      }
    }, delay)
  }, [saveFunction, delay])

  useEffect(() => {
    const hasChanged = JSON.stringify(data) !== JSON.stringify(previousDataRef.current)
    
    if (hasChanged) {
      debouncedSave(data)
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [data, debouncedSave])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return {
    cancel: () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }
}