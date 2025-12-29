import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// Get overdue tasks
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

    const tasks = await prisma.task.findMany({
      where: {
        userId: session.user.id,
        tenantId: session.user.tenantId,
        status: "active",
        dueDate: {
          lt: todayUTC,
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
        { dueDate: "asc" }, // Oldest overdue first
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
    console.error("Get overdue tasks error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}