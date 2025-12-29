import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { DatabaseConnection } from "@/lib/db-connection"

const upcomingSchema = z.object({
  days: z.string().transform(Number).optional(), // Number of days to look ahead
  includeCompleted: z.enum(["none", "1day", "7days", "30days"]).optional().default("none"),
})

// Get upcoming tasks
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
    const { days = 7, includeCompleted } = upcomingSchema.parse(Object.fromEntries(searchParams))

    const now = new Date()
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    const futureDate = new Date(tomorrow)
    futureDate.setDate(futureDate.getDate() + days)

    // Build status filter based on includeCompleted preference
    let whereClause: any = {
      userId: session.user.id,
      tenantId: session.user.tenantId,
      dueDate: {
        gte: tomorrow,
        lt: futureDate,
      }
    }

    if (includeCompleted === "none") {
      whereClause.status = "active"
    } else {
      const completedCutoff = new Date()
      switch (includeCompleted) {
        case "1day":
          completedCutoff.setDate(completedCutoff.getDate() - 1)
          break
        case "7days":
          completedCutoff.setDate(completedCutoff.getDate() - 7)
          break
        case "30days":
          completedCutoff.setDate(completedCutoff.getDate() - 30)
          break
      }

      whereClause.OR = [
        { status: "active" },
        {
          status: "completed",
          completedAt: {
            gte: completedCutoff
          }
        }
      ]
    }

    const tasks = await DatabaseConnection.withRetry(
      () => prisma.task.findMany({
      where: whereClause,
      include: {
        project: {
          select: { id: true, name: true }
        },
        context: {
          select: { id: true, name: true }
        },
        area: {
          select: { id: true, name: true }
        }
        },
        orderBy: [
          { status: "asc" }, // Active tasks first
          { dueDate: "asc" },
          { priority: "desc" },
          { createdAt: "desc" }
        ]
      }),
      'get-upcoming-tasks'
    )

    return NextResponse.json({ 
      tasks,
      dateRange: {
        from: tomorrow.toISOString(),
        to: futureDate.toISOString(),
        days
      },
      total: tasks.length 
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid parameters", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Get upcoming tasks error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}