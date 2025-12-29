import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { DatabaseConnection } from "@/lib/db-connection"

// Bulk delete completed tasks
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { olderThanDays, taskIds } = body

    const where: any = {
      tenantId: session.user.tenantId,
      userId: session.user.id,
      status: "completed",
      completedAt: { not: null }
    }

    // Delete specific tasks by IDs
    if (taskIds && Array.isArray(taskIds) && taskIds.length > 0) {
      where.id = { in: taskIds }
    }
    // Delete tasks older than specified days
    else if (olderThanDays && typeof olderThanDays === "number") {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)
      where.completedAt.lt = cutoffDate
    } else {
      return NextResponse.json(
        { error: "Either taskIds or olderThanDays must be provided" },
        { status: 400 }
      )
    }

    // Get count of tasks to be deleted for confirmation
    const tasksToDelete = await DatabaseConnection.withRetry(
      () => prisma.task.count({ where }),
      'count-tasks-to-delete'
    )

    if (tasksToDelete === 0) {
      return NextResponse.json({
        message: "No tasks found matching the criteria",
        deletedCount: 0
      })
    }

    // Delete the tasks
    const result = await DatabaseConnection.withRetry(
      () => prisma.task.deleteMany({ where }),
      'delete-completed-tasks'
    )

    return NextResponse.json({
      message: `Successfully deleted ${result.count} completed tasks`,
      deletedCount: result.count
    })
  } catch (error) {
    console.error("Delete completed tasks error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}