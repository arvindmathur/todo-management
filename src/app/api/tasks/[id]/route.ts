import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { auditLogger } from "@/lib/audit-logger"
import { OptimizedDbService } from "@/lib/db-optimized"

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

    const task = await prisma.task.findFirst({
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
    })

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
    const existingTask = await prisma.task.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
        tenantId: session.user.tenantId,
      }
    })

    if (!existingTask) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      )
    }

    // Validate related entities if provided
    if (validatedData.projectId) {
      const project = await prisma.project.findFirst({
        where: {
          id: validatedData.projectId,
          userId: session.user.id,
          tenantId: session.user.tenantId,
        }
      })
      if (!project) {
        return NextResponse.json(
          { error: "Project not found" },
          { status: 404 }
        )
      }
    }

    if (validatedData.contextId) {
      const context = await prisma.context.findFirst({
        where: {
          id: validatedData.contextId,
          userId: session.user.id,
          tenantId: session.user.tenantId,
        }
      })
      if (!context) {
        return NextResponse.json(
          { error: "Context not found" },
          { status: 404 }
        )
      }
    }

    if (validatedData.areaId) {
      const area = await prisma.area.findFirst({
        where: {
          id: validatedData.areaId,
          userId: session.user.id,
          tenantId: session.user.tenantId,
        }
      })
      if (!area) {
        return NextResponse.json(
          { error: "Area not found" },
          { status: 404 }
        )
      }
    }

    // Prepare update data
    const updateData: any = { ...validatedData }
    
    if (validatedData.dueDate !== undefined) {
      if (validatedData.dueDate === null) {
        updateData.dueDate = null
      } else if (validatedData.dueDate) {
        // Handle both YYYY-MM-DD and full datetime formats
        if (/^\d{4}-\d{2}-\d{2}$/.test(validatedData.dueDate)) {
          // Date format (YYYY-MM-DD) - set to start of day in UTC
          updateData.dueDate = new Date(validatedData.dueDate + 'T00:00:00.000Z')
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
    } else if (validatedData.status !== "completed" && existingTask.status === "completed") {
      updateData.completedAt = null
    }

    const task = await prisma.task.update({
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
    })

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
    const existingTask = await prisma.task.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
        tenantId: session.user.tenantId,
      }
    })

    if (!existingTask) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      )
    }

    await prisma.task.delete({
      where: { id: params.id }
    })

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