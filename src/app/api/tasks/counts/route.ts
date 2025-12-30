import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { DatabaseConnection } from "@/lib/db-connection"
import { BatchOperations } from "@/lib/db-batch-operations"
import { withErrorHandling, requireAuth } from "@/lib/api-error-handler"

// Global cache for task counts to reduce database load
const countsCache = new Map<string, {
  data: any
  timestamp: number
}>()

const CACHE_DURATION = 5000 // 5 seconds cache for high-frequency endpoint

// Optimized task counts endpoint - single query for all counts with caching
export const GET = withErrorHandling(async (request: NextRequest) => {
  const session = await getServerSession(authOptions)
  requireAuth(session)

  const cacheKey = `counts:${session.user.tenantId}:${session.user.id}`
  const now = Date.now()

  // Check cache first for high performance
  const cached = countsCache.get(cacheKey)
  if (cached && (now - cached.timestamp) < CACHE_DURATION) {
    return NextResponse.json({
      success: true,
      counts: cached.data,
      cached: true,
      timestamp: new Date().toISOString()
    })
  }

  // Ensure healthy database connection
  await DatabaseConnection.ensureHealthyConnection()

  try {
    // Use new timezone-aware task filter service for accurate counts
    const { TaskFilterService } = await import('@/lib/task-filter-service')
    
    const counts = await TaskFilterService.getFilterCounts(
      session.user.tenantId,
      session.user.id
    )

    // Cache the result
    countsCache.set(cacheKey, {
      data: counts,
      timestamp: now
    })

    // Clean up old cache entries periodically
    if (Math.random() < 0.1) { // 10% chance
      const cutoff = now - CACHE_DURATION * 2
      const entries = Array.from(countsCache.entries())
      for (const [key, value] of entries) {
        if (value.timestamp < cutoff) {
          countsCache.delete(key)
        }
      }
    }

    return NextResponse.json({
      success: true,
      counts,
      cached: false,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error fetching task counts:', error)
    
    // Return zero counts on error to prevent UI breaking
    const fallbackCounts = {
      all: 0,
      today: 0,
      overdue: 0,
      upcoming: 0,
      noDueDate: 0,
      focus: 0,
    }

    return NextResponse.json({
      success: false,
      counts: fallbackCounts,
      error: 'Failed to fetch task counts',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}, "getTaskCounts")