import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { DatabaseConnection } from "@/lib/db-connection"
import { BatchOperations } from "@/lib/db-batch-operations"

const updateProjectSchema = z.object({
  name: z.string().min(1, "Project name is required").max(255, "Project name too long").optional(),
  description: z.string().optional(),
  status: z.enum(["active", "someday", "completed", "archived"]).optional(),
  areaId: z.string().nullable().optional(),
  outcome: z.string().optional(),
  nextActionId: z.string().nullable().optional(),
})

const deleteOptionsSchema = z.object({
  taskAction: z.enum(["delete", "unassign", "move"]).default("unassign"),
  moveToProjectId: z.string().optional(),
})

// Get single project
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

    const project = await DatabaseConnection.withRetry(
      () => prisma.project.findFirst({
        where: {
          id: params.id,
          userId: session.user.id,
          tenantId: session.user.tenantId,
        },
        include: {
          area: {
            select: { id: true, name: true }
          },
          tasks: {
            select: {
              id: true,
              title: true,
              description: true,
              status: true,
              priority: true,
              dueDate: true,
              completedAt: true,
              createdAt: true,
            },
            orderBy: [
              { status: "asc" }, // Active tasks first
              { priority: "desc" },
              { dueDate: "asc" },
              { createdAt: "desc" }
            ]
          },
          _count: {
            select: {
              tasks: true
            }
          }
        }
      }),
      'get-project-by-id'
    )

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      )
    }

    // Calculate progress
    const totalTasks = project.tasks.length
    const completedTasks = project.tasks.filter(task => task.status === "completed").length
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
    
    // Find next action
    const nextAction = project.tasks.find(task => task.status === "active") || null
    
    // Check if project should be auto-completed
    const shouldBeCompleted = totalTasks > 0 && completedTasks === totalTasks && project.status === "active"

    const projectWithProgress = {
      ...project,
      progress,
      totalTasks,
      completedTasks,
      shouldBeCompleted,
      nextAction
    }

    return NextResponse.json({ project: projectWithProgress })
  } catch (error) {
    console.error("Get project error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// Update project
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
    const validatedData = updateProjectSchema.parse(body)

    // Check if project exists and belongs to user
    const existingProject = await DatabaseConnection.withRetry(
      () => prisma.project.findFirst({
        where: {
          id: params.id,
          userId: session.user.id,
          tenantId: session.user.tenantId,
        }
      }),
      'check-project-exists'
    )

    if (!existingProject) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      )
    }

    // Validate related entities using batch operations
    const entityIds = {
      areaIds: validatedData.areaId ? [validatedData.areaId] : [],
    }

    if (Object.values(entityIds).some(arr => arr.length > 0)) {
      const validation = await BatchOperations.validateEntities(
        session.user.tenantId,
        session.user.id,
        entityIds
      )

      if (validatedData.areaId && !validation.validAreas.has(validatedData.areaId)) {
        return NextResponse.json(
          { error: "Area not found" },
          { status: 404 }
        )
      }
    }

    // Validate next action belongs to this project if provided
    if (validatedData.nextActionId) {
      const task = await DatabaseConnection.withRetry(
        () => prisma.task.findFirst({
          where: {
            id: validatedData.nextActionId,
            projectId: params.id,
            userId: session.user.id,
            tenantId: session.user.tenantId,
          }
        }),
        'validate-next-action'
      )
      if (!task) {
        return NextResponse.json(
          { error: "Next action task not found in this project" },
          { status: 404 }
        )
      }
    }

    const project = await DatabaseConnection.withRetry(
      () => prisma.project.update({
        where: { id: params.id },
        data: validatedData,
        include: {
          area: {
            select: { id: true, name: true }
          },
          tasks: {
            select: {
              id: true,
              title: true,
              status: true,
              priority: true,
              dueDate: true,
              completedAt: true,
            }
          },
          _count: {
            select: {
              tasks: true
            }
          }
        }
      }),
      'update-project'
    )

    // Calculate progress
    const totalTasks = project.tasks.length
    const completedTasks = project.tasks.filter(task => task.status === "completed").length
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

    const projectWithProgress = {
      ...project,
      progress,
      totalTasks,
      completedTasks,
      nextAction: project.tasks.find(task => task.status === "active") || null
    }

    return NextResponse.json({
      message: "Project updated successfully",
      project: projectWithProgress
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Update project error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// Delete project
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

    const { searchParams } = new URL(request.url)
    const options = deleteOptionsSchema.parse(Object.fromEntries(searchParams))

    // Check if project exists and belongs to user
    const existingProject = await DatabaseConnection.withRetry(
      () => prisma.project.findFirst({
        where: {
          id: params.id,
          userId: session.user.id,
          tenantId: session.user.tenantId,
        },
        include: {
          tasks: true
        }
      }),
      'get-project-for-delete'
    )

    if (!existingProject) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      )
    }

    // Handle associated tasks based on the specified action
    if (existingProject.tasks.length > 0) {
      switch (options.taskAction) {
        case "delete":
          // Delete all associated tasks
          await DatabaseConnection.withRetry(
            () => prisma.task.deleteMany({
              where: {
                projectId: params.id,
                userId: session.user.id,
                tenantId: session.user.tenantId,
              }
            }),
            'delete-project-tasks'
          )
          break
          
        case "move":
          // Move tasks to another project
          if (!options.moveToProjectId) {
            return NextResponse.json(
              { error: "Target project ID required for move operation" },
              { status: 400 }
            )
          }
          
          // Validate target project exists and belongs to user using batch operations
          const validation = await BatchOperations.validateEntities(
            session.user.tenantId,
            session.user.id,
            { projectIds: [options.moveToProjectId] }
          )
          
          if (!validation.validProjects.has(options.moveToProjectId)) {
            return NextResponse.json(
              { error: "Target project not found" },
              { status: 404 }
            )
          }
          
          await DatabaseConnection.withRetry(
            () => prisma.task.updateMany({
              where: {
                projectId: params.id,
                userId: session.user.id,
                tenantId: session.user.tenantId,
              },
              data: {
                projectId: options.moveToProjectId
              }
            }),
            'move-project-tasks'
          )
          break
          
        case "unassign":
        default:
          // Unassign tasks from project (set projectId to null)
          await DatabaseConnection.withRetry(
            () => prisma.task.updateMany({
              where: {
                projectId: params.id,
                userId: session.user.id,
                tenantId: session.user.tenantId,
              },
              data: {
                projectId: null
              }
            }),
            'unassign-project-tasks'
          )
          break
      }
    }

    // Delete the project
    await DatabaseConnection.withRetry(
      () => prisma.project.delete({
        where: { id: params.id }
      }),
      'delete-project'
    )

    return NextResponse.json({
      message: "Project deleted successfully",
      taskAction: options.taskAction,
      tasksAffected: existingProject.tasks.length
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid delete options", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Delete project error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}