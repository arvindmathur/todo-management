import { NextRequest, NextResponse } from 'next/server';
import { checkDatabaseHealth, getConnectionPoolStats } from '@/lib/prisma';
import { DatabaseConnection } from '@/lib/db-connection';

export async function GET(request: NextRequest) {
  try {
    // Get comprehensive database health information
    const [dbHealth, poolStats, connectionStats] = await Promise.all([
      checkDatabaseHealth(),
      getConnectionPoolStats(),
      DatabaseConnection.healthCheck()
    ]);

    const healthData = {
      database: dbHealth,
      connectionPool: poolStats,
      connectionManager: {
        ...connectionStats,
        stats: DatabaseConnection.getConnectionStats()
      },
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      serverless: !!process.env.VERCEL
    };

    // Return appropriate status code based on health
    const isHealthy = dbHealth.healthy && connectionStats.healthy;
    const statusCode = isHealthy ? 200 : 503;

    return NextResponse.json(healthData, { status: statusCode });
  } catch (error) {
    console.error('Database health check failed:', error);
    
    return NextResponse.json({
      database: { healthy: false, error: 'Health check failed' },
      connectionPool: { active: 0, max: 0, utilization: 0 },
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 503 });
  }
}

// Optional: Add a POST endpoint to force cleanup (for emergency use)
export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();
    
    if (action === 'cleanup') {
      await DatabaseConnection.forceCleanup();
      
      return NextResponse.json({
        success: true,
        message: 'Connection pool cleaned up successfully',
        timestamp: new Date().toISOString()
      });
    }
    
    return NextResponse.json({
      error: 'Invalid action. Use "cleanup" to force connection pool cleanup.'
    }, { status: 400 });
  } catch (error) {
    console.error('Database cleanup failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Cleanup failed'
    }, { status: 500 });
  }
}