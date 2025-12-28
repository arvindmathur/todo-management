import { z } from "zod"

// Pagination configuration
export const PAGINATION_LIMITS = {
  MIN: 1,
  MAX: 100,
  DEFAULT: 20,
} as const

// Pagination schema for validation
export const paginationSchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .refine((val) => val >= 1, "Page must be at least 1"),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : PAGINATION_LIMITS.DEFAULT))
    .refine(
      (val) => val >= PAGINATION_LIMITS.MIN && val <= PAGINATION_LIMITS.MAX,
      `Limit must be between ${PAGINATION_LIMITS.MIN} and ${PAGINATION_LIMITS.MAX}`
    ),
  offset: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 0))
    .refine((val) => val >= 0, "Offset must be non-negative"),
})

// Cursor-based pagination schema (for better performance with large datasets)
export const cursorPaginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : PAGINATION_LIMITS.DEFAULT))
    .refine(
      (val) => val >= PAGINATION_LIMITS.MIN && val <= PAGINATION_LIMITS.MAX,
      `Limit must be between ${PAGINATION_LIMITS.MIN} and ${PAGINATION_LIMITS.MAX}`
    ),
})

export interface PaginationParams {
  page: number
  limit: number
  offset: number
}

export interface CursorPaginationParams {
  cursor?: string
  limit: number
}

export interface PaginationResult<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    offset: number
    totalCount: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export interface CursorPaginationResult<T> {
  data: T[]
  pagination: {
    limit: number
    hasNext: boolean
    nextCursor?: string
  }
}

// Create pagination parameters from query params
export function createPaginationParams(searchParams: URLSearchParams): PaginationParams {
  const parsed = paginationSchema.parse(Object.fromEntries(searchParams))
  
  // Calculate offset from page if not provided
  const offset = parsed.offset || (parsed.page - 1) * parsed.limit
  
  return {
    page: parsed.page,
    limit: parsed.limit,
    offset,
  }
}

// Create cursor pagination parameters from query params
export function createCursorPaginationParams(searchParams: URLSearchParams): CursorPaginationParams {
  return cursorPaginationSchema.parse(Object.fromEntries(searchParams))
}

// Create pagination result
export function createPaginationResult<T>(
  data: T[],
  params: PaginationParams,
  totalCount: number
): PaginationResult<T> {
  const totalPages = Math.ceil(totalCount / params.limit)
  
  return {
    data,
    pagination: {
      page: params.page,
      limit: params.limit,
      offset: params.offset,
      totalCount,
      totalPages,
      hasNext: params.page < totalPages,
      hasPrev: params.page > 1,
    },
  }
}

// Create cursor pagination result
export function createCursorPaginationResult<T>(
  data: T[],
  params: CursorPaginationParams,
  getNextCursor?: (lastItem: T) => string
): CursorPaginationResult<T> {
  const hasNext = data.length === params.limit
  const nextCursor = hasNext && data.length > 0 && getNextCursor 
    ? getNextCursor(data[data.length - 1])
    : undefined
  
  return {
    data,
    pagination: {
      limit: params.limit,
      hasNext,
      nextCursor,
    },
  }
}

// Optimized pagination for large datasets using cursor-based approach
export class CursorPaginator<T extends { id: string; createdAt: Date }> {
  constructor(
    private model: any,
    private baseWhere: any = {}
  ) {}

  async paginate(
    params: CursorPaginationParams,
    additionalWhere: any = {},
    orderBy: any = { createdAt: "desc" }
  ): Promise<CursorPaginationResult<T>> {
    const where = {
      ...this.baseWhere,
      ...additionalWhere,
    }

    // Add cursor condition for pagination
    if (params.cursor) {
      const cursorData = this.decodeCursor(params.cursor)
      where.OR = [
        {
          createdAt: { lt: cursorData.createdAt },
        },
        {
          createdAt: cursorData.createdAt,
          id: { lt: cursorData.id },
        },
      ]
    }

    const data = await this.model.findMany({
      where,
      orderBy,
      take: params.limit,
    })

    return createCursorPaginationResult(
      data,
      params,
      (item) => this.encodeCursor(item)
    )
  }

  private encodeCursor(item: T): string {
    return Buffer.from(
      JSON.stringify({
        id: item.id,
        createdAt: item.createdAt.toISOString(),
      })
    ).toString("base64")
  }

  private decodeCursor(cursor: string): { id: string; createdAt: Date } {
    const decoded = JSON.parse(Buffer.from(cursor, "base64").toString())
    return {
      id: decoded.id,
      createdAt: new Date(decoded.createdAt),
    }
  }
}

// Performance monitoring for pagination
export class PaginationPerformanceMonitor {
  private static metrics = new Map<string, { count: number; totalTime: number }>()

  static async monitor<T>(
    operation: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const start = Date.now()
    
    try {
      const result = await fn()
      const duration = Date.now() - start
      
      this.recordMetric(operation, duration)
      
      // Log slow queries
      if (duration > 1000) {
        console.warn(`Slow pagination query: ${operation} took ${duration}ms`)
      }
      
      return result
    } catch (error) {
      const duration = Date.now() - start
      console.error(`Pagination error in ${operation} after ${duration}ms:`, error)
      throw error
    }
  }

  private static recordMetric(operation: string, duration: number) {
    const existing = this.metrics.get(operation) || { count: 0, totalTime: 0 }
    this.metrics.set(operation, {
      count: existing.count + 1,
      totalTime: existing.totalTime + duration,
    })
  }

  static getMetrics(): Record<string, { count: number; avgTime: number }> {
    const result: Record<string, { count: number; avgTime: number }> = {}
    
    this.metrics.forEach((metric, operation) => {
      result[operation] = {
        count: metric.count,
        avgTime: Math.round(metric.totalTime / metric.count),
      }
    })
    
    return result
  }

  static reset() {
    this.metrics.clear()
  }
}

// Utility for efficient counting with caching
export async function getCachedCount(
  cacheKey: string,
  countFn: () => Promise<number>,
  ttlSeconds: number = 300
): Promise<number> {
  // This would integrate with the cache service
  // For now, just return the count directly
  return countFn()
}