import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// Get today's tasks
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const now = new Date()
    // Use UTC dates to avoid timezone issues
    const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    const tomorrowUTC = new Date(todayUTC)
    tomorrowUTC.setUTCDate(tomorrowUTC.getUTCDate() + 1)

    const tasks = await prisma.task.findMany({
      where: {
        userId: session.user.id,
        tenantId: session.user.tenantId,
        status: "active",
        dueDate: {
          gte: todayUTC,
          lt: tomorrowUTC,
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
        { priority: "desc" },
        { createdAt: "desc" }
      ]
    })

    return NextResponse.json({ 
      tasks,
      date: todayUTC.toISOString(),
      total: tasks.length 
    })
  } catch (error) {
    console.error("Get today's tasks error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}