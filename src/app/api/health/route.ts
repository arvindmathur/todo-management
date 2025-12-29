import { NextResponse } from "next/server"
import { DatabaseConnection } from "@/lib/db-connection"
import { cache } from "@/lib/cache"
import { getVersionInfo } from "@/lib/version"

export async function GET() {
  try {
    const startTime = Date.now()
    
    // Check database health
    const dbHealth = await DatabaseConnection.healthCheck()
    
    // Check cache health
    const cacheStats = await cache.getStats()
    
    const totalTime = Date.now() - startTime
    
    const health = {
      status: dbHealth.healthy ? 'healthy' : 'unhealthy',
      version: getVersionInfo(),
      timestamp: new Date().toISOString(),
      checks: {
        database: {
          healthy: dbHealth.healthy,
          latency: dbHealth.latency,
          error: dbHealth.error,
        },
        cache: {
          type: cacheStats.type,
          connected: cacheStats.connected,
          size: cacheStats.size,
        },
      },
      responseTime: totalTime,
    }
    
    const statusCode = dbHealth.healthy ? 200 : 503
    
    return NextResponse.json(health, { status: statusCode })
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}