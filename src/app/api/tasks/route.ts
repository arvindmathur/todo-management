import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { auditLogger } from "@/lib/audit-logger"
import { OptimizedDbService } from "@/lib/db-optimized"
import { createPaginationParams, createPaginationResult } from "@/lib/pagination"
import { 
  withErrorHandling, 
  validateRequest, 
  requireAuth, 
  requireResource 
} from "@/lib/api-error-handler"
import { ValidationError } from "@/lib/errors"

const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(500, "Title too long"),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  dueDate: z.string().optional(),
  projectId: z.string().optional(),
  contextId: z.string().optional(),
  areaId: z.string().optional(),
  tags: z.array(z.string()).default([]),
})

const taskFiltersSchema = z.object({
  status: z.enum(["active", "completed", "archived"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  projectId: z.string().optional(),
  contextId: z.string().optional(),
  areaId: z.string().optional(),
  dueDate: z.enum(["today", "overdue", "upcoming", "no-due-date"]).optional(),
  search: z.string().optional(),
  limit: z.string().transform(Number).optional(),
  offset: z.string().transform(Number).optional(),
})

// Get tasks with filtering
export const GET = withErrorHandling(async (request: NextRequest) => {
  const session = await getServerSession(authOptions)
  requireAuth(session)

  const { searchParams } = new URL(request.url)
  const filters = validateRequest(taskFiltersSchema, Object.fromEntries(searchParams), "Task filters")
  const paginationParams = createPaginationParams(searchParams)

  // Use optimized database service with caching
  const result = await OptimizedDbService.getTasks(
    session.user.tenantId,
    session.user.id,
    {
      ...filters,
      limit: paginationParams.limit,
      offset: paginationParams.offset,
    }
  )

  // Log data access (less frequently for performance)
  if (Math.random() < 0.1) { // Log 10% of requests to reduce overhead
    await auditLogger.logDataAccess(
      session.user.tenantId,
      session.user.id,
      "task",
      "READ",
      result.tasks.length,
      request
    )
  }

  // Create paginated response
  const paginatedResult = createPaginationResult(
    result.tasks,
    paginationParams,
    result.totalCount
  )

  return NextResponse.json(paginatedResult)
}, "getTasks")

// Create new task
export const POST = withErrorHandling(async (request: NextRequest) => {
  const session = await getServerSession(authOptions)
  requireAuth(session)

  const body = await request.json()
  const validatedData = validateRequest(createTaskSchema, body, "Task creation")

  // Validate related entities belong to user
  if (validatedData.projectId) {
    const project = await prisma.project.findFirst({
      where: {
        id: validatedData.projectId,
        userId: session.user.id,
        tenantId: session.user.tenantId,
      }
    })
    requireResource(project, "Project")
  }

  if (validatedData.contextId) {
    const context = await prisma.context.findFirst({
      where: {
        id: validatedData.contextId,
        userId: session.user.id,
        tenantId: session.user.tenantId,
      }
    })
    requireResource(context, "Context")
  }

  if (validatedData.areaId) {
    const area = await prisma.area.findFirst({
      where: {
        id: validatedData.areaId,
        userId: session.user.id,
        tenantId: session.user.tenantId,
      }
    })
    requireResource(area, "Area")
  }

  // Validate and convert dueDate if provided
  let dueDate: Date | null = null
  if (validatedData.dueDate) {
    // Handle both YYYY-MM-DD and full datetime formats
    if (/^\d{4}-\d{2}-\d{2}$/.test(validatedData.dueDate)) {
      // Date format (YYYY-MM-DD) - set to start of day in UTC
      dueDate = new Date(validatedData.dueDate + 'T00:00:00.000Z')
    } else {
      // Try to parse as datetime
      dueDate = new Date(validatedData.dueDate)
      if (isNaN(dueDate.getTime())) {
        throw new ValidationError("Invalid date format")
      }
    }
  }

  const task = await prisma.task.create({
    data: {
      title: validatedData.title,
      description: validatedData.description,
      priority: validatedData.priority,
      dueDate,
      projectId: validatedData.projectId,
      contextId: validatedData.contextId,
      areaId: validatedData.areaId,
      tags: validatedData.tags,
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

  // Log task creation
  await auditLogger.logCreate(
    session.user.tenantId,
    session.user.id,
    "task",
    task.id,
    {
      title: task.title,
      priority: task.priority,
      projectId: task.projectId,
      contextId: task.contextId,
      areaId: task.areaId
    },
    request
  )

  // Invalidate relevant caches
  await OptimizedDbService.invalidateUserCaches(session.user.tenantId, session.user.id)

  return NextResponse.json(
    { 
      message: "Task created successfully",
      task 
    },
    { status: 201 }
  )
}, "createTask")