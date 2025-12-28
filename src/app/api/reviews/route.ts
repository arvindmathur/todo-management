import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const createReviewSchema = z.object({
  notes: z.string().optional(),
  nextWeekFocus: z.string().optional(),
})

// Get current review session or create new one
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const tenantId = session.user.tenantId
    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant not found" },
        { status: 404 }
      )
    }

    // Check for active review
    const activeReview = await prisma.weeklyReview.findFirst({
      where: {
        tenantId,
        userId: session.user.id,
        status: "in_progress"
      },
      orderBy: { createdAt: "desc" }
    })

    // Get projects for review
    const projects = await prisma.project.findMany({
      where: {
        tenantId,
        userId: session.user.id,
        status: { in: ["active", "someday"] }
      },
      include: {
        area: {
          select: { id: true, name: true }
        },
        tasks: {
          where: { status: { not: "completed" } },
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            dueDate: true,
            completedAt: true,
            createdAt: true,
            updatedAt: true
          },
          orderBy: { createdAt: "desc" }
        },
        _count: {
          select: {
            tasks: {
              where: { status: "completed" }
            }
          }
        }
      }
    })

    // Get areas for review
    const areas = await prisma.area.findMany({
      where: {
        tenantId,
        userId: session.user.id
      },
      include: {
        projects: {
          where: { status: { in: ["active", "someday"] } },
          select: {
            id: true,
            name: true,
            status: true,
            createdAt: true,
            tasks: {
              where: { status: { not: "completed" } },
              select: { id: true }
            },
            _count: {
              select: {
                tasks: {
                  where: { status: "completed" }
                }
              }
            }
          }
        },
        tasks: {
          where: { status: { not: "completed" } },
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            dueDate: true,
            completedAt: true,
            createdAt: true,
            updatedAt: true
          },
          orderBy: { updatedAt: "desc" }
        }
      }
    })

    // Get last completed review
    const lastReview = await prisma.weeklyReview.findFirst({
      where: {
        tenantId,
        userId: session.user.id,
        status: "completed"
      },
      orderBy: { completedAt: "desc" }
    })

    // Calculate review data
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

    // Process projects for review
    const reviewProjects = projects.map(project => {
      const totalTasks = project._count.tasks
      const completedTasks = project._count.tasks // This needs to be fixed in the query above
      const activeTasks = project.tasks.length
      const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0

      // Find next action (highest priority incomplete task)
      const nextAction = project.tasks
        .filter(task => task.status !== "completed")
        .sort((a, b) => {
          const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 }
          return (priorityOrder[b.priority as keyof typeof priorityOrder] || 0) - 
                 (priorityOrder[a.priority as keyof typeof priorityOrder] || 0)
        })[0]

      const hasNextAction = !!nextAction
      const lastActivity = project.tasks.length > 0 
        ? new Date(Math.max(...project.tasks.map(t => new Date(t.updatedAt).getTime())))
        : project.updatedAt

      const needsAttention = !hasNextAction || 
                           (lastActivity && lastActivity < oneWeekAgo) ||
                           (project.status === "active" && activeTasks === 0)

      return {
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        areaId: project.areaId,
        area: project.area,
        tasks: project.tasks,
        progress,
        totalTasks,
        completedTasks,
        hasNextAction,
        nextAction,
        lastActivity,
        needsAttention
      }
    })

    // Process areas for review
    const reviewAreas = areas.map(area => {
      const recentActivity = [
        ...area.projects.map(p => ({
          type: "project_created" as const,
          date: p.createdAt,
          description: `Project "${p.name}" created`
        })),
        ...area.tasks.map(t => ({
          type: t.status === "completed" ? "task_completed" as const : "task_created" as const,
          date: t.updatedAt,
          description: `Task "${t.title}" ${t.status === "completed" ? "completed" : "created"}`
        }))
      ]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10)

      const hasRecentActivity = recentActivity.some(activity => 
        new Date(activity.date) > oneWeekAgo
      )

      const attentionReasons = []
      if (!hasRecentActivity) attentionReasons.push("No recent activity")
      if (area.projects.length === 0 && area.tasks.length === 0) {
        attentionReasons.push("No active projects or tasks")
      }

      const needsAttention = attentionReasons.length > 0

      return {
        id: area.id,
        name: area.name,
        description: area.description,
        color: area.color,
        projects: area.projects.map(p => ({
          id: p.id,
          name: p.name,
          status: p.status,
          progress: p._count.tasks > 0 ? (p._count.tasks / (p._count.tasks + p.tasks.length)) * 100 : 0
        })),
        tasks: area.tasks,
        recentActivity,
        needsAttention,
        attentionReasons
      }
    })

    // Calculate summary
    const summary = {
      totalProjects: projects.length,
      activeProjects: projects.filter(p => p.status === "active").length,
      projectsNeedingAttention: reviewProjects.filter(p => p.needsAttention).length,
      totalAreas: areas.length,
      areasNeedingAttention: reviewAreas.filter(a => a.needsAttention).length,
      completedTasksThisWeek: 0, // Would need additional query
      overdueTasks: 0 // Would need additional query
    }

    const daysSinceLastReview = lastReview?.completedAt 
      ? Math.floor((Date.now() - new Date(lastReview.completedAt).getTime()) / (1000 * 60 * 60 * 24))
      : undefined

    const reviewSession = {
      id: activeReview?.id || "new",
      projects: reviewProjects,
      areas: reviewAreas,
      summary,
      lastReviewDate: lastReview?.completedAt,
      daysSinceLastReview
    }

    return NextResponse.json({
      session: reviewSession,
      currentReview: activeReview
    })
  } catch (error) {
    console.error("Get review session error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// Create new weekly review
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const tenantId = session.user.tenantId
    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant not found" },
        { status: 404 }
      )
    }

    const body = await request.json()
    const validatedData = createReviewSchema.parse(body)

    // Check if there's already an active review
    const activeReview = await prisma.weeklyReview.findFirst({
      where: {
        tenantId,
        userId: session.user.id,
        status: "in_progress"
      }
    })

    if (activeReview) {
      return NextResponse.json(
        { error: "There is already an active review session" },
        { status: 400 }
      )
    }

    // Create new review
    const review = await prisma.weeklyReview.create({
      data: {
        tenantId,
        userId: session.user.id,
        status: "in_progress",
        reviewData: {
          projectsReviewed: [],
          areasReviewed: [],
          notes: validatedData.notes,
          nextWeekFocus: validatedData.nextWeekFocus
        }
      }
    })

    return NextResponse.json({
      message: "Weekly review started",
      review
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Create review error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}