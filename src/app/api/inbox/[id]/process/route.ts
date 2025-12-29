import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { DatabaseConnection } from "@/lib/db-connection"
import { BatchOperations } from "@/lib/db-batch-operations"

const processInboxItemSchema = z.object({
  action: z.enum(["convert_to_task", "convert_to_project", "mark_as_reference", "delete"]),
  taskData: z.object({
    title: z.string().min(1, "Title is required").max(500, "Title too long"),
    description: z.string().optional(),
    priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
    dueDate: z.string().datetime().optional(),
    projectId: z.string().optional(),
    contextId: z.string().optional(),
    areaId: z.string().optional(),
    tags: z.array(z.string()).default([]),
  }).optional(),
  projectData: z.object({
    name: z.string().min(1, "Project name is required").max(255, "Project name too long"),
    description: z.string().optional(),
    areaId: z.string().optional(),
    outcome: z.string().optional(),
  }).optional(),
  referenceNote: z.string().optional(),
})

// Process inbox item
export async function POST(
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
    const validatedData = processInboxItemSchema.parse(body)

    // Check if inbox item exists and belongs to user
    const existingItem = await DatabaseConnection.withRetry(
      () => prisma.inboxItem.findFirst({
        where: {
          id: params.id,
          userId: session.user.id,
          tenantId: session.user.tenantId,
        }
      }),
      'check-inbox-item-for-process'
    )

    if (!existingItem) {
      return NextResponse.json(
        { error: "Inbox item not found" },
        { status: 404 }
      )
    }

    if (existingItem.processed) {
      return NextResponse.json(
        { error: "Inbox item has already been processed" },
        { status: 400 }
      )
    }

    let result: any = {}

    // Process based on action
    switch (validatedData.action) {
      case "convert_to_task":
        if (!validatedData.taskData) {
          return NextResponse.json(
            { error: "Task data is required for task conversion" },
            { status: 400 }
          )
        }

        // Validate related entities using batch operations
        const entityIds = {
          projectIds: validatedData.taskData.projectId ? [validatedData.taskData.projectId] : [],
          contextIds: validatedData.taskData.contextId ? [validatedData.taskData.contextId] : [],
          areaIds: validatedData.taskData.areaId ? [validatedData.taskData.areaId] : [],
        }

        if (Object.values(entityIds).some(arr => arr.length > 0)) {
          const validation = await BatchOperations.validateEntities(
            session.user.tenantId,
            session.user.id,
            entityIds
          )

          if (validatedData.taskData.projectId && !validation.validProjects.has(validatedData.taskData.projectId)) {
            return NextResponse.json(
              { error: "Project not found" },
              { status: 404 }
            )
          }

          if (validatedData.taskData.contextId && !validation.validContexts.has(validatedData.taskData.contextId)) {
            return NextResponse.json(
              { error: "Context not found" },
              { status: 404 }
            )
          }

          if (validatedData.taskData.areaId && !validation.validAreas.has(validatedData.taskData.areaId)) {
            return NextResponse.json(
              { error: "Area not found" },
              { status: 404 }
            )
          }
        }

        // Validate that taskData is provided for task conversion
        if (!validatedData.taskData) {
          return NextResponse.json(
            { error: "Task data is required for task conversion" },
            { status: 400 }
          )
        }

        // Create task
        const task = await DatabaseConnection.withRetry(
          () => prisma.task.create({
            data: {
              title: validatedData.taskData!.title,
              description: validatedData.taskData!.description,
              priority: validatedData.taskData!.priority,
              dueDate: validatedData.taskData!.dueDate ? new Date(validatedData.taskData!.dueDate) : null,
              projectId: validatedData.taskData!.projectId,
              contextId: validatedData.taskData!.contextId,
              areaId: validatedData.taskData!.areaId,
              tags: validatedData.taskData!.tags,
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
          'create-task-from-inbox'
        )

        result = { task, type: "task" }
        break

      case "convert_to_project":
        if (!validatedData.projectData) {
          return NextResponse.json(
            { error: "Project data is required for project conversion" },
            { status: 400 }
          )
        }

        // Validate area if provided using batch operations
        if (validatedData.projectData.areaId) {
          const validation = await BatchOperations.validateEntities(
            session.user.tenantId,
            session.user.id,
            { areaIds: [validatedData.projectData.areaId] }
          )
          
          if (!validation.validAreas.has(validatedData.projectData.areaId)) {
            return NextResponse.json(
              { error: "Area not found" },
              { status: 404 }
            )
          }
        }

        // Create project
        const projectData = validatedData.projectData!
        const project = await DatabaseConnection.withRetry(
          () => prisma.project.create({
            data: {
              name: projectData.name!,
              description: projectData.description,
              areaId: projectData.areaId,
              outcome: projectData.outcome,
              userId: session.user.id,
              tenantId: session.user.tenantId,
            },
            include: {
              area: {
                select: { id: true, name: true }
              }
            }
          }),
          'create-project-from-inbox'
        )

        result = { project, type: "project" }
        break

      case "mark_as_reference":
        // Just mark as processed - could be extended to create a reference system later
        result = { 
          type: "reference", 
          note: validatedData.referenceNote || "Marked as reference material" 
        }
        break

      case "delete":
        // Will be deleted after marking as processed
        result = { type: "deleted" }
        break

      default:
        return NextResponse.json(
          { error: "Invalid processing action" },
          { status: 400 }
        )
    }

    // Mark inbox item as processed and handle deletion/count in parallel
    const operations: Promise<any>[] = [
      DatabaseConnection.withRetry(
        () => prisma.inboxItem.update({
          where: { id: params.id },
          data: {
            processed: true,
            processedAt: new Date(),
          }
        }),
        'mark-inbox-processed'
      )
    ]

    // If action was delete, remove the item entirely
    if (validatedData.action === "delete") {
      operations.push(
        DatabaseConnection.withRetry(
          () => prisma.inboxItem.delete({
            where: { id: params.id }
          }),
          'delete-processed-inbox-item'
        )
      )
    }

    // Always get updated count
    const countPromise = DatabaseConnection.withRetry(
      () => prisma.inboxItem.count({
        where: {
          userId: session.user.id,
          tenantId: session.user.tenantId,
          processed: false,
        }
      }),
      'count-unprocessed-after-process'
    )

    const [processedItem, deletedItem, unprocessedCount] = await Promise.all([
      ...operations,
      countPromise
    ])

    return NextResponse.json({
      message: "Inbox item processed successfully",
      action: validatedData.action,
      result,
      processedItem: validatedData.action !== "delete" ? processedItem : null,
      unprocessedCount
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid processing data", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Process inbox item error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}