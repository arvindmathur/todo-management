import { NextRequest, NextResponse } from "next/server"
import { ZodError } from "zod"
import { Prisma } from "@prisma/client"
import { 
  AppError, 
  ValidationError, 
  AuthenticationError, 
  AuthorizationError, 
  NotFoundError, 
  ConflictError,
  DatabaseError,
  formatErrorResponse,
  reportError
} from "./errors"

// Enhanced API error handler with comprehensive error mapping
export function createApiErrorHandler(operation: string) {
  return function handleApiError(error: unknown, request?: NextRequest): NextResponse {
    const path = request?.url

    // Log the error for debugging
    console.error(`API Error in ${operation}:`, error)

    // Handle different error types
    if (error instanceof AppError) {
      const errorResponse = formatErrorResponse(error, path)
      return NextResponse.json(errorResponse, { status: error.statusCode })
    }

    // Handle Zod validation errors
    if (error instanceof ZodError) {
      const validationError = new ValidationError(
        "Validation failed",
        undefined,
        error.errors
      )
      const errorResponse = formatErrorResponse(validationError, path)
      return NextResponse.json(errorResponse, { status: 400 })
    }

    // Handle Prisma errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      const dbError = mapPrismaError(error)
      const errorResponse = formatErrorResponse(dbError, path)
      return NextResponse.json(errorResponse, { status: dbError.statusCode })
    }

    // Handle Prisma validation errors
    if (error instanceof Prisma.PrismaClientValidationError) {
      const validationError = new ValidationError("Invalid database operation")
      const errorResponse = formatErrorResponse(validationError, path)
      return NextResponse.json(errorResponse, { status: 400 })
    }

    // Handle generic errors
    if (error instanceof Error) {
      // Report unexpected errors
      reportError(error, { operation, path })
      
      const appError = new AppError(
        process.env.NODE_ENV === "production" 
          ? "Internal server error" 
          : error.message,
        500,
        false
      )
      const errorResponse = formatErrorResponse(appError, path)
      return NextResponse.json(errorResponse, { status: 500 })
    }

    // Handle unknown errors
    const unknownError = new AppError("An unexpected error occurred", 500, false)
    const errorResponse = formatErrorResponse(unknownError, path)
    return NextResponse.json(errorResponse, { status: 500 })
  }
}

// Map Prisma errors to application errors
function mapPrismaError(error: Prisma.PrismaClientKnownRequestError): AppError {
  switch (error.code) {
    case "P2002":
      // Unique constraint violation
      const field = error.meta?.target as string[] | undefined
      return new ValidationError(
        `A record with this ${field?.join(", ") || "value"} already exists`,
        field?.[0]
      )
    
    case "P2025":
      // Record not found
      return new NotFoundError("Record not found")
    
    case "P2003":
      // Foreign key constraint violation
      return new ValidationError("Referenced record does not exist")
    
    case "P2004":
      // Constraint violation
      return new ValidationError("Operation violates database constraints")
    
    case "P2014":
      // Invalid ID
      return new ValidationError("Invalid ID provided")
    
    case "P2021":
      // Table does not exist
      return new DatabaseError("Database table not found")
    
    case "P2022":
      // Column does not exist
      return new DatabaseError("Database column not found")
    
    case "P1001":
      // Connection error
      return new DatabaseError("Database connection failed")
    
    case "P1002":
      // Connection timeout
      return new DatabaseError("Database connection timeout")
    
    default:
      return new DatabaseError(`Database error: ${error.message}`)
  }
}

// Wrapper for API route handlers with error handling
export function withErrorHandling<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>,
  operation: string
) {
  const errorHandler = createApiErrorHandler(operation)
  
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args)
    } catch (error) {
      return errorHandler(error, args[0] as NextRequest)
    }
  }
}

// Async wrapper for better error handling in API routes
export async function safeApiCall<T>(
  operation: () => Promise<T>,
  errorContext?: string
): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    if (errorContext) {
      console.error(`Error in ${errorContext}:`, error)
    }
    throw error
  }
}

// Validation helper with better error messages
export function validateRequest<T>(
  schema: { parse: (data: unknown) => T },
  data: unknown,
  context?: string
): T {
  try {
    return schema.parse(data)
  } catch (error) {
    if (error instanceof ZodError) {
      const firstError = error.errors[0]
      throw new ValidationError(
        `${context ? `${context}: ` : ""}${firstError.message}`,
        firstError.path.join("."),
        error.errors
      )
    }
    throw error
  }
}

// Authentication helper
export function requireAuth(session: any): asserts session is { user: { id: string; tenantId: string } } {
  if (!session?.user?.id) {
    throw new AuthenticationError("Authentication required")
  }
}

// Authorization helper
export function requirePermission(condition: boolean, message?: string): void {
  if (!condition) {
    throw new AuthorizationError(message || "Insufficient permissions")
  }
}

// Resource existence helper
export function requireResource<T>(resource: T | null | undefined, name?: string): T {
  if (!resource) {
    throw new NotFoundError(`${name || "Resource"} not found`)
  }
  return resource
}

// Rate limiting helper
export function checkRateLimit(
  identifier: string,
  limit: number,
  windowMs: number,
  store: Map<string, { count: number; resetTime: number }> = new Map()
): void {
  const now = Date.now()
  const key = identifier
  
  // Clean up expired entries
  store.forEach((v, k) => {
    if (now > v.resetTime) {
      store.delete(k)
    }
  })
  
  const entry = store.get(key)
  
  if (!entry || now > entry.resetTime) {
    store.set(key, { count: 1, resetTime: now + windowMs })
    return
  }
  
  if (entry.count >= limit) {
    throw new AppError(
      "Rate limit exceeded. Please try again later.",
      429,
      true,
      "RATE_LIMIT_EXCEEDED"
    )
  }
  
  entry.count++
}