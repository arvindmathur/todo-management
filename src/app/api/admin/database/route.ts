import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { DatabaseConnection } from "@/lib/db-connection"
import { getConnectionPoolStats } from "@/lib/prisma"
import { withErrorHandling, requireAuth } from "@/lib/api-error-handler"

// Admin-only database monitoring endpoint
export const GET = withErrorHandling(async (request: NextRequest) => {
  const session = await getServerSession(authOptions)
  requireAuth(session)

  // Check if user is admin
  if (session.user.email !== 'arvind8mathur@gmail.com') {
    return NextResponse.json(
      { error: "Unauthorized - Admin access required" },
      { status: 403 }
    )
  }

  try {
    // Get comprehensive database statistics
    const [healthCheck, connectionStats] = await Promise.all([
      DatabaseConnection.healthCheck(),
      Promise.resolve(getConnectionPoolStats())
    ])

    // Get additional connection info
    const connectionInfo = DatabaseConnection.getConnectionStats()

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      database: {
        health: healthCheck,
        connectionPool: connectionStats,
        connectionManager: connectionInfo,
        recommendations: generateRecommendations(healthCheck, connectionStats, connectionInfo)
      }
    })

  } catch (error) {
    console.error('Database monitoring error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to get database statistics',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}, "getDatabaseStats")

// Admin endpoint to force cleanup database connections
export const POST = withErrorHandling(async (request: NextRequest) => {
  const session = await getServerSession(authOptions)
  requireAuth(session)

  // Check if user is admin
  if (session.user.email !== 'arvind8mathur@gmail.com') {
    return NextResponse.json(
      { error: "Unauthorized - Admin access required" },
      { status: 403 }
    )
  }

  try {
    const body = await request.json()
    
    if (body.action === 'cleanup') {
      await DatabaseConnection.forceCleanup()
      
      return NextResponse.json({
        success: true,
        message: 'Database connections cleaned up successfully',
        timestamp: new Date().toISOString()
      })
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action. Use {"action": "cleanup"}',
      timestamp: new Date().toISOString()
    }, { status: 400 })

  } catch (error) {
    console.error('Database cleanup error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to cleanup database connections',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}, "cleanupDatabase")

function generateRecommendations(
  healthCheck: any,
  connectionStats: any,
  connectionInfo: any
): string[] {
  const recommendations = []

  if (!healthCheck.healthy) {
    recommendations.push("🔴 Database is unhealthy - check connection configuration")
  }

  if (connectionStats.utilization > 80) {
    recommendations.push("⚠️ High connection pool utilization - consider reducing concurrent operations")
  }

  if (healthCheck.latency && healthCheck.latency > 1000) {
    recommendations.push("⚠️ High database latency - check network connectivity")
  }

  if (connectionInfo.queueLength > 5) {
    recommendations.push("⚠️ High operation queue length - database may be overloaded")
  }

  if (connectionStats.active === connectionStats.max) {
    recommendations.push("🔴 Connection pool at maximum capacity - immediate attention required")
  }

  if (recommendations.length === 0) {
    recommendations.push("✅ Database performance looks good")
  }

  return recommendations
}