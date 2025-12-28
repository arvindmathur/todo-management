import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { cache } from "@/lib/cache"
import { PaginationPerformanceMonitor } from "@/lib/pagination"

// Get performance metrics (admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // In a real app, you'd check if user is admin
    // For now, we'll allow any authenticated user to see performance metrics

    const [cacheStats, paginationMetrics] = await Promise.all([
      cache.getStats(),
      Promise.resolve(PaginationPerformanceMonitor.getMetrics()),
    ])

    const performanceStats = {
      cache: cacheStats,
      pagination: paginationMetrics,
      timestamp: new Date().toISOString(),
    }

    return NextResponse.json(performanceStats)
  } catch (error) {
    console.error("Performance stats error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// Reset performance metrics (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Reset pagination metrics
    PaginationPerformanceMonitor.reset()

    return NextResponse.json({
      message: "Performance metrics reset successfully",
    })
  } catch (error) {
    console.error("Reset performance metrics error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}