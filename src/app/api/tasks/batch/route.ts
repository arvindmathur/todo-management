import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { OptimizedDbService } from "@/lib/db-optimized"
import { auditLogger } from "@/lib/audit-logger"

const batchUpdateSchema = z.object({
  taskIds: z.array(z.string()).min(1, "At least one task ID required").max(100, "Maximum 100 tasks allowed"),
  updates: z.object({
    status: z.enum(["active", "completed", "archived"]).optional(),
    priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
    projectId: z.string().nullable().optional(),
    contextId: z.string().nullable().optional(),
    areaId: z.string().nullable().optional(),
    tags: z.array(z.string()).optional(),
  }).refine(
    (data) => Object.keys(data).length > 0,
    "At least one update field is required"
  ),
})

const batchDeleteSchema = z.object({
  taskIds: z.array(z.string()).min(1, "At least one task ID required").max(100, "Maximum 100 tasks allowed"),
})

// Batch update tasks
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { taskIds, updates } = batchUpdateSchema.parse(body)

    // Handle status changes for completion tracking
    const updateData: any = { ...updates }
    if (updates.status === "completed") {
      updateData.completedAt = new Date()
    } else if (updates.status === "active") {
      updateData.completedAt = null
    }

    // Perform batch update using optimized service
    const result = await OptimizedDbService.batchUpdateTasks(
      session.user.tenantId,
      session.user.id,
      taskIds,
      updateData
    )

    // Log batch operation
    await auditLogger.logBulkDelete(
      session.user.tenantId,
      session.user.id,
      "task",
      result.count,
      { operation: "batch_update", updates },
      request
    )

    return NextResponse.json({
      message: `Successfully updated ${result.count} tasks`,
      updatedCount: result.count,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Batch update tasks error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// Batch delete tasks
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
    const { taskIds } = batchDeleteSchema.parse(body)

    // Perform batch delete using optimized service
    const result = await OptimizedDbService.batchDeleteTasks(
      session.user.tenantId,
      session.user.id,
      taskIds
    )

    // Log batch operation
    await auditLogger.logBulkDelete(
      session.user.tenantId,
      session.user.id,
      "task",
      result.count,
      { operation: "batch_delete", taskIds },
      request
    )

    return NextResponse.json({
      message: `Successfully deleted ${result.count} tasks`,
      deletedCount: result.count,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Batch delete tasks error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}