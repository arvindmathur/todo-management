import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { auditLogger } from "@/lib/audit-logger"
import { OptimizedDbService } from "@/lib/db-optimized"
import { BatchOperations } from "@/lib/db-batch-operations"
import { DatabaseConnection } from "@/lib/db-connection"
import { NotificationScheduler } from "@/lib/email/scheduler"

const updateTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(500, "Title too long").optional(),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  dueDate: z.string().optional().nullable(),
  projectId: z.string().optional().nullable(),
  contextId: z.string().optional().nullable(),
  areaId: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  status: z.enum(["active", "completed", "archived"]).optional(),
  reminderEnabled: z.boolean().optional(),
  reminderDays: z.number().min(1).max(30).optional(),
})

// Get single task
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const task = await DatabaseConnection.withRetry(
      () => prisma.task.findFirst({
        where: {
          id: params.id,
          userId: session.user.id,
          tenantId: session.user.tenantId,
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
        }
      }),
      'get-task'
    )

    if (!task) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ task })
  } catch (error) {
    console.error("Get task error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// Update task
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedData = updateTaskSchema.parse(body)

    // Check if task exists and belongs to user
    const existingTask = await DatabaseConnection.withRetry(
      () => prisma.task.findFirst({
        where: {
          id: params.id,
          userId: session.user.id,
          tenantId: session.user.tenantId,
        }
      }),
      'update-task-find-existing'
    )

    if (!existingTask) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      )
    }

    // Validate related entities using batch operations for efficiency
    if (validatedData.projectId || validatedData.contextId || validatedData.areaId) {
      const entityValidation = await BatchOperations.validateEntities(
        session.user.tenantId,
        session.user.id,
        {
          projectIds: validatedData.projectId ? [validatedData.projectId] : undefined,
          contextIds: validatedData.contextId ? [validatedData.contextId] : undefined,
          areaIds: validatedData.areaId ? [validatedData.areaId] : undefined,
        }
      )

      if (validatedData.projectId && !entityValidation.validProjects.has(validatedData.projectId)) {
        return NextResponse.json(
          { error: "Project not found" },
          { status: 404 }
        )
      }
      if (validatedData.contextId && !entityValidation.validContexts.has(validatedData.contextId)) {
        return NextResponse.json(
          { error: "Context not found" },
          { status: 404 }
        )
      }
      if (validatedData.areaId && !entityValidation.validAreas.has(validatedData.areaId)) {
        return NextResponse.json(
          { error: "Area not found" },
          { status: 404 }
        )
      }
    }

    // Prepare update data
    const updateData: any = { ...validatedData }
    
    // Prevent uncompleting tasks
    if (validatedData.status !== "completed" && existingTask.status === "completed") {
      return NextResponse.json(
        { error: "Cannot uncomplete a completed task" },
        { status: 400 }
      )
    }
    
    // Set originalDueDate if this is the first time setting a due date
    if (validatedData.dueDate !== undefined && !existingTask.originalDueDate && validatedData.dueDate) {
      // Import timezone service
      const { TimezoneService } = await import('@/lib/timezone-service')
      
      if (/^\d{4}-\d{2}-\d{2}$/.test(validatedData.dueDate)) {
        updateData.originalDueDate = TimezoneService.convertToUTC(validatedData.dueDate, await TimezoneService.getUserTimezone(session.user.id))
      } else {
        const parsedDate = new Date(validatedData.dueDate)
        if (!isNaN(parsedDate.getTime())) {
          updateData.originalDueDate = parsedDate
        }
      }
    }
    
    if (validatedData.dueDate !== undefined) {
      if (validatedData.dueDate === null) {
        updateData.dueDate = null
      } else if (validatedData.dueDate) {
        // Import timezone service
        const { TimezoneService } = await import('@/lib/timezone-service')
        
        // Handle both YYYY-MM-DD and full datetime formats
        if (/^\d{4}-\d{2}-\d{2}$/.test(validatedData.dueDate)) {
          // Date format (YYYY-MM-DD) - convert using user's timezone
          updateData.dueDate = TimezoneService.convertToUTC(validatedData.dueDate, await TimezoneService.getUserTimezone(session.user.id))
        } else {
          // Try to parse as datetime
          const parsedDate = new Date(validatedData.dueDate)
          if (isNaN(parsedDate.getTime())) {
            return NextResponse.json(
              { error: "Invalid date format" },
              { status: 400 }
            )
          }
          updateData.dueDate = parsedDate
        }
      }
    }

    // Handle status changes
    if (validatedData.status === "completed" && existingTask.status !== "completed") {
      updateData.completedAt = new Date()
    }

    const task = await DatabaseConnection.withRetry(
      () => prisma.task.update({
        where: { id: params.id },
        data: updateData,
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
        }
      }),
      'update-task'
    )

    // Handle reminder scheduling if reminder fields were updated
    if (validatedData.reminderEnabled !== undefined || 
        validatedData.reminderDays !== undefined || 
        validatedData.dueDate !== undefined ||
        validatedData.status === "completed") {
      
      try {
        // Get user preferences for timezone
        const user = await DatabaseConnection.withRetry(
          () => prisma.user.findUnique({
            where: { id: session.user.id },
            select: { preferences: true }
          }),
          'get-user-timezone-preferences'
        );
        
        const preferences = (user?.preferences as any) || {};
        const userTimezone = preferences.timezone || 'UTC';

        // Update reminder scheduling
        await NotificationScheduler.updateTaskReminder(
          task.id,
          session.user.id,
          session.user.tenantId,
          task.dueDate,
          task.reminderEnabled,
          task.reminderDays || 1,
          userTimezone
        );
      } catch (reminderError) {
        // Don't fail task update if reminder scheduling fails
        console.warn('Failed to update task reminder:', reminderError);
      }
    }

    // Log task update
    await auditLogger.logUpdate(
      session.user.tenantId,
      session.user.id,
      "task",
      task.id,
      {
        title: existingTask.title,
        priority: existingTask.priority,
        status: existingTask.status,
        projectId: existingTask.projectId,
        contextId: existingTask.contextId,
        areaId: existingTask.areaId
      },
      {
        title: task.title,
        priority: task.priority,
        status: task.status,
        projectId: task.projectId,
        contextId: task.contextId,
        areaId: task.areaId
      },
      request
    )

    // Invalidate relevant caches
    await OptimizedDbService.invalidateUserCaches(session.user.tenantId, session.user.id)

    return NextResponse.json({
      message: "Task updated successfully",
      task
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Update task error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// Delete task
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Check if task exists and belongs to user
    const existingTask = await DatabaseConnection.withRetry(
      () => prisma.task.findFirst({
        where: {
          id: params.id,
          userId: session.user.id,
          tenantId: session.user.tenantId,
        }
      }),
      'delete-task-find-existing'
    )

    if (!existingTask) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      )
    }

    await DatabaseConnection.withRetry(
      () => prisma.task.delete({
        where: { id: params.id }
      }),
      'delete-task'
    )

    // Cancel any pending reminders for this task
    try {
      await NotificationScheduler.cancelTaskNotifications(params.id);
    } catch (reminderError) {
      // Don't fail task deletion if reminder cancellation fails
      console.warn('Failed to cancel task reminders:', reminderError);
    }

    // Log task deletion
    await auditLogger.logDelete(
      session.user.tenantId,
      session.user.id,
      "task",
      existingTask.id,
      {
        title: existingTask.title,
        priority: existingTask.priority,
        status: existingTask.status
      },
      request
    )

    // Invalidate relevant caches
    await OptimizedDbService.invalidateUserCaches(session.user.tenantId, session.user.id)

    return NextResponse.json({
      message: "Task deleted successfully"
    })
  } catch (error) {
    console.error("Delete task error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}