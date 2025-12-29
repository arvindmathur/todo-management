import { NextRequest, NextResponse } from "next/server"
import { DatabaseConnection } from "@/lib/db-connection"
import { checkDatabaseHealth } from "@/lib/prisma"

// Database health check endpoint
export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now()
    
    // Perform comprehensive health check
    const [basicHealth, connectionStats] = await Promise.all([
      DatabaseConnection.healthCheck(),
      Promise.resolve(DatabaseConnection.getConnectionStats())
    ])
    
    const totalLatency = Date.now() - startTime
    
    // Additional connection test
    let connectionTest: { success: boolean; error: string | null } = { success: false, error: null }
    try {
      await checkDatabaseHealth()
      connectionTest.success = true
    } catch (error) {
      connectionTest.error = error instanceof Error ? error.message : 'Unknown error'
    }
    
    const response = {
      status: basicHealth.healthy && connectionTest.success ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      database: {
        connected: basicHealth.healthy,
        latency: basicHealth.latency || totalLatency,
        cached: basicHealth.cached || false,
        error: basicHealth.error || connectionTest.error
      },
      connection: {
        isHealthy: connectionStats.isHealthy,
        lastHealthCheck: new Date(connectionStats.lastHealthCheck).toISOString(),
        timeSinceLastCheck: connectionStats.timeSinceLastCheck
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        isVercel: !!process.env.VERCEL,
        region: process.env.VERCEL_REGION || 'unknown'
      }
    }
    
    // Return appropriate status code
    const statusCode = response.status === 'healthy' ? 200 : 503
    
    return NextResponse.json(response, { status: statusCode })
  } catch (error) {
    console.error('Health check failed:', error)
    
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Health check failed',
      database: {
        connected: false,
        error: 'Health check exception'
      }
    }, { status: 503 })
  }
}