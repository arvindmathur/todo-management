// Custom error types for better error handling
export class AppError extends Error {
  public readonly statusCode: number
  public readonly isOperational: boolean
  public readonly code?: string

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    code?: string
  ) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = isOperational
    this.code = code
    this.name = this.constructor.name

    Error.captureStackTrace(this, this.constructor)
  }
}

export class ValidationError extends AppError {
  public readonly field?: string
  public readonly details?: any

  constructor(message: string, field?: string, details?: any) {
    super(message, 400, true, "VALIDATION_ERROR")
    this.field = field
    this.details = details
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = "Authentication required") {
    super(message, 401, true, "AUTHENTICATION_ERROR")
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = "Insufficient permissions") {
    super(message, 403, true, "AUTHORIZATION_ERROR")
  }
}

export class NotFoundError extends AppError {
  public readonly resource?: string

  constructor(message: string = "Resource not found", resource?: string) {
    super(message, 404, true, "NOT_FOUND_ERROR")
    this.resource = resource
  }
}

export class ConflictError extends AppError {
  constructor(message: string = "Resource conflict") {
    super(message, 409, true, "CONFLICT_ERROR")
  }
}

export class RateLimitError extends AppError {
  public readonly retryAfter?: number

  constructor(message: string = "Rate limit exceeded", retryAfter?: number) {
    super(message, 429, true, "RATE_LIMIT_ERROR")
    this.retryAfter = retryAfter
  }
}

export class DatabaseError extends AppError {
  public readonly query?: string

  constructor(message: string = "Database operation failed", query?: string) {
    super(message, 500, false, "DATABASE_ERROR")
    this.query = query
  }
}

export class ExternalServiceError extends AppError {
  public readonly service?: string

  constructor(message: string = "External service error", service?: string) {
    super(message, 502, true, "EXTERNAL_SERVICE_ERROR")
    this.service = service
  }
}

// Error response formatter
export interface ErrorResponse {
  error: string
  message: string
  statusCode: number
  code?: string
  details?: any
  timestamp: string
  path?: string
}

export function formatErrorResponse(
  error: Error | AppError,
  path?: string
): ErrorResponse {
  const isAppError = error instanceof AppError
  
  const response: ErrorResponse = {
    error: isAppError ? error.constructor.name : "InternalServerError",
    message: error.message,
    statusCode: isAppError ? error.statusCode : 500,
    timestamp: new Date().toISOString(),
  }

  if (path) {
    response.path = path
  }

  if (isAppError) {
    if (error.code) {
      response.code = error.code
    }

    // Add specific details for certain error types
    if (error instanceof ValidationError && error.details) {
      response.details = error.details
    }

    if (error instanceof RateLimitError && error.retryAfter) {
      response.details = { retryAfter: error.retryAfter }
    }
  }

  // Don't expose internal details in production
  if (process.env.NODE_ENV === "production" && !isAppError) {
    response.message = "Internal server error"
  }

  return response
}

// Error handler for API routes
export function handleApiError(error: Error, path?: string): Response {
  console.error("API Error:", error)

  const errorResponse = formatErrorResponse(error, path)
  
  // Log critical errors
  if (errorResponse.statusCode >= 500) {
    console.error("Critical error:", {
      error: error.message,
      stack: error.stack,
      path,
      timestamp: errorResponse.timestamp,
    })
  }

  return new Response(JSON.stringify(errorResponse), {
    status: errorResponse.statusCode,
    headers: {
      "Content-Type": "application/json",
    },
  })
}

// Client-side error types
export interface ClientError {
  type: "network" | "validation" | "authentication" | "authorization" | "not_found" | "server" | "unknown"
  message: string
  statusCode?: number
  code?: string
  details?: any
}

export function parseClientError(error: any): ClientError {
  // Network errors
  if (!navigator.onLine) {
    return {
      type: "network",
      message: "No internet connection. Please check your network and try again.",
    }
  }

  // Fetch errors
  if (error instanceof TypeError && error.message.includes("fetch")) {
    return {
      type: "network",
      message: "Network error. Please check your connection and try again.",
    }
  }

  // API response errors
  if (error.response) {
    const { status, data } = error.response
    
    switch (status) {
      case 400:
        return {
          type: "validation",
          message: data?.message || "Invalid request. Please check your input.",
          statusCode: status,
          code: data?.code,
          details: data?.details,
        }
      case 401:
        return {
          type: "authentication",
          message: data?.message || "Please sign in to continue.",
          statusCode: status,
          code: data?.code,
        }
      case 403:
        return {
          type: "authorization",
          message: data?.message || "You don't have permission to perform this action.",
          statusCode: status,
          code: data?.code,
        }
      case 404:
        return {
          type: "not_found",
          message: data?.message || "The requested resource was not found.",
          statusCode: status,
          code: data?.code,
        }
      case 429:
        return {
          type: "server",
          message: data?.message || "Too many requests. Please try again later.",
          statusCode: status,
          code: data?.code,
          details: data?.details,
        }
      case 500:
      case 502:
      case 503:
      case 504:
        return {
          type: "server",
          message: data?.message || "Server error. Please try again later.",
          statusCode: status,
          code: data?.code,
        }
      default:
        return {
          type: "unknown",
          message: data?.message || "An unexpected error occurred.",
          statusCode: status,
          code: data?.code,
        }
    }
  }

  // Generic errors
  return {
    type: "unknown",
    message: error.message || "An unexpected error occurred.",
  }
}

// Retry logic for failed requests
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      
      // Don't retry on client errors (4xx)
      if (error instanceof AppError && error.statusCode >= 400 && error.statusCode < 500) {
        throw error
      }

      // Don't retry on the last attempt
      if (attempt === maxRetries) {
        break
      }

      // Exponential backoff
      const waitTime = delay * Math.pow(2, attempt - 1)
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
  }

  throw lastError!
}

// Error reporting (placeholder for external service integration)
export function reportError(error: Error, context?: any) {
  if (process.env.NODE_ENV === "production") {
    // In production, you would send this to an error reporting service
    // Example: Sentry.captureException(error, { extra: context })
    console.error("Error reported:", error, context)
  } else {
    console.error("Development error:", error, context)
  }
}