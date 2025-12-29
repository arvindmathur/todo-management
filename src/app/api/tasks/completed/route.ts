import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { DatabaseConnection } from "@/lib/db-connection"

// Get completed tasks with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const search = searchParams.get("search") || ""
    const projectId = searchParams.get("projectId")
    const contextId = searchParams.get("contextId")
    const areaId = searchParams.get("areaId")
    const dateFrom = searchParams.get("dateFrom")
    const dateTo = searchParams.get("dateTo")
    const archived = searchParams.get("archived") === "true"

    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {
      tenantId: session.user.tenantId,
      userId: session.user.id,
      status: "completed",
      completedAt: { not: null }
    }

    // Add search filter
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } }
      ]
    }

    // Add project filter
    if (projectId) {
      where.projectId = projectId
    }

    // Add context filter
    if (contextId) {
      where.contextId = contextId
    }

    // Add area filter
    if (areaId) {
      where.areaId = areaId
    }

    // Add date range filter
    if (dateFrom || dateTo) {
      where.completedAt = {}
      if (dateFrom) {
        where.completedAt.gte = new Date(dateFrom)
      }
      if (dateTo) {
        where.completedAt.lte = new Date(dateTo)
      }
    }

    // Add archived filter (tasks older than 90 days)
    if (archived) {
      const ninetyDaysAgo = new Date()
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
      where.completedAt.lt = ninetyDaysAgo
    } else {
      // Only show non-archived tasks by default
      const ninetyDaysAgo = new Date()
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
      if (!where.completedAt) {
        where.completedAt = {}
      }
      where.completedAt.gte = ninetyDaysAgo
    }

    const [tasks, totalCount] = await Promise.all([
      DatabaseConnection.withRetry(
        () => prisma.task.findMany({
          where,
          include: {
          project: {
            select: { id: true, name: true }
          },
          context: {
            select: { id: true, name: true, icon: true }
          },
          area: {
            select: { id: true, name: true, color: true }
          }
        },
        orderBy: { completedAt: "desc" },
        skip,
        take: limit
      }),
      'get-completed-tasks'
    ),
    DatabaseConnection.withRetry(
      () => prisma.task.count({ where }),
      'count-completed-tasks'
    )
    ])

    const totalPages = Math.ceil(totalCount / limit)

    return NextResponse.json({
      tasks,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    })
  } catch (error) {
    console.error("Get completed tasks error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}