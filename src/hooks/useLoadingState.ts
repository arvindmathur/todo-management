"use client"

import { useState, useCallback, useRef, useEffect } from "react"

export interface LoadingState {
  isLoading: boolean
  error: string | null
  data: any
}

export interface LoadingOptions {
  initialLoading?: boolean
  timeout?: number
  onTimeout?: () => void
}

// Basic loading state hook
export function useLoadingState(initialLoading: boolean = false) {
  const [isLoading, setIsLoading] = useState(initialLoading)
  const [error, setError] = useState<string | null>(null)

  const startLoading = useCallback(() => {
    setIsLoading(true)
    setError(null)
  }, [])

  const stopLoading = useCallback(() => {
    setIsLoading(false)
  }, [])

  const setLoadingError = useCallback((error: string) => {
    setError(error)
    setIsLoading(false)
  }, [])

  const reset = useCallback(() => {
    setIsLoading(false)
    setError(null)
  }, [])

  return {
    isLoading,
    error,
    startLoading,
    stopLoading,
    setError: setLoadingError,
    reset,
  }
}

// Advanced loading state with timeout and data management
export function useAsyncState<T = any>(options: LoadingOptions = {}) {
  const { initialLoading = false, timeout, onTimeout } = options
  
  const [state, setState] = useState<LoadingState>({
    isLoading: initialLoading,
    error: null,
    data: null,
  })
  
  const timeoutRef = useRef<NodeJS.Timeout>()
  const abortControllerRef = useRef<AbortController>()

  const execute = useCallback(async <R = T>(
    asyncFunction: (signal?: AbortSignal) => Promise<R>,
    options: {
      onSuccess?: (data: R) => void
      onError?: (error: any) => void
      transform?: (data: R) => T
    } = {}
  ): Promise<R | null> => {
    const { onSuccess, onError, transform } = options

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController()
    const signal = abortControllerRef.current.signal

    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
    }))

    // Set timeout if specified
    if (timeout && onTimeout) {
      timeoutRef.current = setTimeout(() => {
        abortControllerRef.current?.abort()
        onTimeout()
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: "Operation timed out",
        }))
      }, timeout)
    }

    try {
      const result = await asyncFunction(signal)
      
      if (signal.aborted) {
        return null
      }

      const finalData = transform ? transform(result) : result as unknown as T

      setState({
        isLoading: false,
        error: null,
        data: finalData,
      })

      if (onSuccess) {
        onSuccess(result)
      }

      return result
    } catch (error: any) {
      if (signal.aborted) {
        return null
      }

      const errorMessage = error.message || "An error occurred"
      
      setState({
        isLoading: false,
        error: errorMessage,
        data: null,
      })

      if (onError) {
        onError(error)
      }

      return null
    } finally {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [timeout, onTimeout])

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setState({
      isLoading: false,
      error: null,
      data: null,
    })
  }, [])

  const setData = useCallback((data: T) => {
    setState(prev => ({
      ...prev,
      data,
      error: null,
    }))
  }, [])

  const setError = useCallback((error: string) => {
    setState(prev => ({
      ...prev,
      error,
      isLoading: false,
    }))
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return {
    ...state,
    execute,
    reset,
    setData,
    setError,
  }
}

// Multiple loading states manager
export function useMultipleLoadingStates() {
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({})
  const [errors, setErrors] = useState<Record<string, string | null>>({})

  const setLoading = useCallback((key: string, loading: boolean) => {
    setLoadingStates(prev => ({
      ...prev,
      [key]: loading,
    }))
    
    if (loading) {
      setErrors(prev => ({
        ...prev,
        [key]: null,
      }))
    }
  }, [])

  const setError = useCallback((key: string, error: string | null) => {
    setErrors(prev => ({
      ...prev,
      [key]: error,
    }))
    
    if (error) {
      setLoadingStates(prev => ({
        ...prev,
        [key]: false,
      }))
    }
  }, [])

  const isLoading = useCallback((key: string) => {
    return loadingStates[key] || false
  }, [loadingStates])

  const getError = useCallback((key: string) => {
    return errors[key] || null
  }, [errors])

  const isAnyLoading = useCallback(() => {
    return Object.values(loadingStates).some(Boolean)
  }, [loadingStates])

  const hasAnyError = useCallback(() => {
    return Object.values(errors).some(Boolean)
  }, [errors])

  const reset = useCallback((key?: string) => {
    if (key) {
      setLoadingStates(prev => ({
        ...prev,
        [key]: false,
      }))
      setErrors(prev => ({
        ...prev,
        [key]: null,
      }))
    } else {
      setLoadingStates({})
      setErrors({})
    }
  }, [])

  return {
    setLoading,
    setError,
    isLoading,
    getError,
    isAnyLoading,
    hasAnyError,
    reset,
    loadingStates,
    errors,
  }
}

// Debounced loading state for search/filter operations
export function useDebouncedLoading(delay: number = 300) {
  const [isLoading, setIsLoading] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout>()

  const setLoading = useCallback((loading: boolean) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    if (loading) {
      setIsLoading(true)
    } else {
      timeoutRef.current = setTimeout(() => {
        setIsLoading(false)
      }, delay)
    }
  }, [delay])

  const forceStop = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setIsLoading(false)
  }, [])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return {
    isLoading,
    setLoading,
    forceStop,
  }
}

// Loading state with progress tracking
export function useProgressLoading() {
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState<string>("")

  const startLoading = useCallback((initialMessage?: string) => {
    setIsLoading(true)
    setProgress(0)
    setMessage(initialMessage || "Loading...")
  }, [])

  const updateProgress = useCallback((newProgress: number, newMessage?: string) => {
    setProgress(Math.max(0, Math.min(100, newProgress)))
    if (newMessage) {
      setMessage(newMessage)
    }
  }, [])

  const completeLoading = useCallback((finalMessage?: string) => {
    setProgress(100)
    if (finalMessage) {
      setMessage(finalMessage)
    }
    
    // Small delay to show completion
    setTimeout(() => {
      setIsLoading(false)
      setProgress(0)
      setMessage("")
    }, 500)
  }, [])

  const stopLoading = useCallback(() => {
    setIsLoading(false)
    setProgress(0)
    setMessage("")
  }, [])

  return {
    isLoading,
    progress,
    message,
    startLoading,
    updateProgress,
    completeLoading,
    stopLoading,
  }
}