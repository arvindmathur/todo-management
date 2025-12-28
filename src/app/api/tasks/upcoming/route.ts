import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const upcomingSchema = z.object({
  days: z.string().transform(Number).optional(), // Number of days to look ahead
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
    const { days = 7 } = upcomingSchema.parse(Object.fromEntries(searchParams))

    const now = new Date()
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    const futureDate = new Date(tomorrow)
    futureDate.setDate(futureDate.getDate() + days)

    const tasks = await prisma.task.findMany({
      where: {
        userId: session.user.id,
        tenantId: session.user.tenantId,
        status: "active",
        dueDate: {
          gte: tomorrow,
          lt: futureDate,
        }
      },
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
        { dueDate: "asc" },
        { priority: "desc" },
        { createdAt: "desc" }
      ]
    })

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