"use client"

import { useCallback } from "react"
import { useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import { parseClientError, ClientError, withRetry } from "@/lib/errors"
import { useErrorToast, useWarningToast } from "@/components/feedback"

export function useErrorHandling() {
  const router = useRouter()
  const showError = useErrorToast()
  const showWarning = useWarningToast()

  const handleError = useCallback(async (error: any, context?: string) => {
    const clientError = parseClientError(error)
    
    // Handle different error types
    switch (clientError.type) {
      case "authentication":
        showError("Authentication Required", "Please sign in to continue")
        // Redirect to sign in after a short delay
        setTimeout(() => {
          signOut({ callbackUrl: "/auth/signin" })
        }, 2000)
        break
        
      case "authorization":
        showError("Access Denied", clientError.message)
        // Optionally redirect to a safe page
        setTimeout(() => {
          router.push("/dashboard")
        }, 2000)
        break
        
      case "network":
        showWarning("Connection Issue", clientError.message)
        break
        
      case "validation":
        showError("Invalid Input", clientError.message)
        break
        
      case "not_found":
        showError("Not Found", clientError.message)
        break
        
      case "server":
        if (clientError.statusCode === 429) {
          const retryAfter = clientError.details?.retryAfter
          showWarning(
            "Rate Limited", 
            retryAfter 
              ? `Please wait ${retryAfter} seconds before trying again`
              : "Too many requests. Please try again later."
          )
        } else {
          showError("Server Error", clientError.message)
        }
        break
        
      default:
        showError("Unexpected Error", clientError.message)
    }

    // Log error for debugging
    console.error(`Error in ${context || "unknown"}:`, error)
  }, [showError, showWarning, router])

  return { handleError }
}

// Hook for API calls with automatic error handling
export function useApiCall() {
  const { handleError } = useErrorHandling()

  const apiCall = useCallback(async <T>(
    operation: () => Promise<T>,
    options: {
      context?: string
      showSuccess?: boolean
      successMessage?: string
      retries?: number
      onSuccess?: (data: T) => void
      onError?: (error: ClientError) => void
    } = {}
  ): Promise<T | null> => {
    const {
      context = "API call",
      retries = 0,
      onSuccess,
      onError
    } = options

    try {
      const result = retries > 0 
        ? await withRetry(operation, retries)
        : await operation()
      
      if (onSuccess) {
        onSuccess(result)
      }
      
      return result
    } catch (error) {
      const clientError = parseClientError(error)
      
      if (onError) {
        onError(clientError)
      } else {
        await handleError(error, context)
      }
      
      return null
    }
  }, [handleError])

  return { apiCall }
}

// Hook for form submission with error handling
export function useFormSubmission<T = any>() {
  const { handleError } = useErrorHandling()

  const submitForm = useCallback(async (
    operation: () => Promise<T>,
    options: {
      onSuccess?: (data: T) => void
      onError?: (error: ClientError) => void
      context?: string
    } = {}
  ): Promise<{ success: boolean; data?: T; error?: ClientError }> => {
    const { onSuccess, onError, context = "Form submission" } = options

    try {
      const data = await operation()
      
      if (onSuccess) {
        onSuccess(data)
      }
      
      return { success: true, data }
    } catch (error) {
      const clientError = parseClientError(error)
      
      if (onError) {
        onError(clientError)
      } else {
        await handleError(error, context)
      }
      
      return { success: false, error: clientError }
    }
  }, [handleError])

  return { submitForm }
}

// Hook for handling async operations with loading states
export function useAsyncOperation() {
  const { handleError } = useErrorHandling()

  const executeAsync = useCallback(async <T>(
    operation: () => Promise<T>,
    options: {
      onStart?: () => void
      onSuccess?: (data: T) => void
      onError?: (error: ClientError) => void
      onFinally?: () => void
      context?: string
    } = {}
  ): Promise<{ success: boolean; data?: T; error?: ClientError }> => {
    const { onStart, onSuccess, onError, onFinally, context = "Async operation" } = options

    try {
      if (onStart) {
        onStart()
      }

      const data = await operation()
      
      if (onSuccess) {
        onSuccess(data)
      }
      
      return { success: true, data }
    } catch (error) {
      const clientError = parseClientError(error)
      
      if (onError) {
        onError(clientError)
      } else {
        await handleError(error, context)
      }
      
      return { success: false, error: clientError }
    } finally {
      if (onFinally) {
        onFinally()
      }
    }
  }, [handleError])

  return { executeAsync }
}

// Hook for retry logic with exponential backoff
export function useRetryOperation() {
  const { handleError } = useErrorHandling()

  const retryOperation = useCallback(async <T>(
    operation: () => Promise<T>,
    options: {
      maxRetries?: number
      delay?: number
      backoff?: boolean
      context?: string
      onRetry?: (attempt: number, error: any) => void
    } = {}
  ): Promise<T | null> => {
    const {
      maxRetries = 3,
      delay = 1000,
      backoff = true,
      context = "Retry operation",
      onRetry
    } = options

    let lastError: any

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error
        
        // Don't retry on client errors (4xx)
        const clientError = parseClientError(error)
        if (clientError.statusCode && clientError.statusCode >= 400 && clientError.statusCode < 500) {
          break
        }

        // Don't retry on the last attempt
        if (attempt === maxRetries) {
          break
        }

        if (onRetry) {
          onRetry(attempt, error)
        }

        // Wait before retrying
        const waitTime = backoff ? delay * Math.pow(2, attempt - 1) : delay
        await new Promise(resolve => setTimeout(resolve, waitTime))
      }
    }

    // Handle the final error
    await handleError(lastError, context)
    return null
  }, [handleError])

  return { retryOperation }
}