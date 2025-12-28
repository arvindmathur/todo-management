import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { OptimizedDbService } from "@/lib/db-optimized"

// Get dashboard statistics with caching
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Fetch all dashboard data in parallel using optimized queries
    const [
      taskCounts,
      projectStats,
      contexts,
      areas,
      inboxCount,
    ] = await Promise.all([
      OptimizedDbService.getTaskCounts(session.user.tenantId, session.user.id),
      OptimizedDbService.getProjectStats(session.user.tenantId, session.user.id),
      OptimizedDbService.getContexts(session.user.tenantId, session.user.id),
      OptimizedDbService.getAreas(session.user.tenantId, session.user.id),
      OptimizedDbService.getInboxCount(session.user.tenantId, session.user.id),
    ])

    // Calculate additional metrics
    const totalActiveTasks = taskCounts.active
    const completionRate = taskCounts.completed > 0 
      ? Math.round((taskCounts.completed / (taskCounts.completed + taskCounts.active)) * 100)
      : 0

    const urgentTasks = await OptimizedDbService.getTasks(
      session.user.tenantId,
      session.user.id,
      { priority: "urgent", limit: 5 }
    )

    const recentlyCompleted = await OptimizedDbService.getTasks(
      session.user.tenantId,
      session.user.id,
      { status: "completed", limit: 5 }
    )

    const dashboardStats = {
      taskCounts,
      projectStats,
      contexts: contexts.slice(0, 10), // Limit for performance
      areas: areas.slice(0, 10), // Limit for performance
      inboxCount,
      metrics: {
        totalActiveTasks,
        completionRate,
        overdueCount: taskCounts.overdue,
        todayCount: taskCounts.today,
        upcomingCount: taskCounts.upcoming,
      },
      urgentTasks: urgentTasks.tasks,
      recentlyCompleted: recentlyCompleted.tasks,
      lastUpdated: new Date().toISOString(),
    }

    return NextResponse.json(dashboardStats)
  } catch (error) {
    console.error("Dashboard stats error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}