import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// Get completed tasks statistics
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const baseWhere = {
      tenantId: session.user.tenantId,
      userId: session.user.id,
      status: "completed",
      completedAt: { not: null }
    }

    // Calculate date ranges
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
    const thisWeekStart = new Date(now)
    thisWeekStart.setDate(now.getDate() - now.getDay())
    thisWeekStart.setHours(0, 0, 0, 0)
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const [
      totalCompleted,
      recentCompleted,
      archivedCompleted,
      thisWeekCompleted,
      thisMonthCompleted,
      completedByProject,
      completedByArea,
      completedByContext
    ] = await Promise.all([
      // Total completed tasks
      prisma.task.count({ where: baseWhere }),
      
      // Recent completed tasks (last 90 days)
      prisma.task.count({
        where: {
          ...baseWhere,
          completedAt: { gte: ninetyDaysAgo }
        }
      }),
      
      // Archived completed tasks (older than 90 days)
      prisma.task.count({
        where: {
          ...baseWhere,
          completedAt: { lt: ninetyDaysAgo }
        }
      }),
      
      // This week completed
      prisma.task.count({
        where: {
          ...baseWhere,
          completedAt: { gte: thisWeekStart }
        }
      }),
      
      // This month completed
      prisma.task.count({
        where: {
          ...baseWhere,
          completedAt: { gte: thisMonthStart }
        }
      }),
      
      // Completed by project
      prisma.task.groupBy({
        by: ['projectId'],
        where: {
          ...baseWhere,
          projectId: { not: null }
        },
        _count: { id: true }
      }),
      
      // Completed by area
      prisma.task.groupBy({
        by: ['areaId'],
        where: {
          ...baseWhere,
          areaId: { not: null }
        },
        _count: { id: true }
      }),
      
      // Completed by context
      prisma.task.groupBy({
        by: ['contextId'],
        where: {
          ...baseWhere,
          contextId: { not: null }
        },
        _count: { id: true }
      })
    ])

    // Get project names for completed by project
    const projectIds = completedByProject.map(p => p.projectId).filter((id): id is string => id !== null)
    const projects = projectIds.length > 0 ? await prisma.project.findMany({
      where: {
        id: { in: projectIds },
        tenantId: session.user.tenantId,
        userId: session.user.id
      },
      select: { id: true, name: true }
    }) : []

    // Get area names for completed by area
    const areaIds = completedByArea.map(a => a.areaId).filter((id): id is string => id !== null)
    const areas = areaIds.length > 0 ? await prisma.area.findMany({
      where: {
        id: { in: areaIds },
        tenantId: session.user.tenantId,
        userId: session.user.id
      },
      select: { id: true, name: true, color: true }
    }) : []

    // Get context names for completed by context
    const contextIds = completedByContext.map(c => c.contextId).filter((id): id is string => id !== null)
    const contexts = contextIds.length > 0 ? await prisma.context.findMany({
      where: {
        id: { in: contextIds },
        tenantId: session.user.tenantId,
        userId: session.user.id
      },
      select: { id: true, name: true, icon: true }
    }) : []

    // Format the grouped data
    const completedByProjectFormatted = completedByProject.map(item => {
      const project = projects.find(p => p.id === item.projectId)
      return {
        projectId: item.projectId,
        projectName: project?.name || "Unknown Project",
        count: item._count.id
      }
    })

    const completedByAreaFormatted = completedByArea.map(item => {
      const area = areas.find(a => a.id === item.areaId)
      return {
        areaId: item.areaId,
        areaName: area?.name || "Unknown Area",
        areaColor: area?.color,
        count: item._count.id
      }
    })

    const completedByContextFormatted = completedByContext.map(item => {
      const context = contexts.find(c => c.id === item.contextId)
      return {
        contextId: item.contextId,
        contextName: context?.name || "Unknown Context",
        contextIcon: context?.icon,
        count: item._count.id
      }
    })

    return NextResponse.json({
      totalCompleted,
      recentCompleted,
      archivedCompleted,
      thisWeekCompleted,
      thisMonthCompleted,
      completedByProject: completedByProjectFormatted,
      completedByArea: completedByAreaFormatted,
      completedByContext: completedByContextFormatted,
      retentionInfo: {
        thirtyDaysAgo: thirtyDaysAgo.toISOString(),
        ninetyDaysAgo: ninetyDaysAgo.toISOString(),
        oneYearAgo: oneYearAgo.toISOString()
      }
    })
  } catch (error) {
    console.error("Get completed tasks stats error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}