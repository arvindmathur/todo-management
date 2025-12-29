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
import { DatabaseConnection } from "@/lib/db-connection"

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
  dueDate: z.enum(["today", "overdue", "upcoming", "no-due-date", "focus"]).optional(),
  search: z.string().optional(),
  limit: z.string().transform(Number).optional(),
  offset: z.string().transform(Number).optional(),
})

// Get tasks with filtering and improved connection management
export const GET = withErrorHandling(async (request: NextRequest) => {
  const session = await getServerSession(authOptions)
  requireAuth(session)

  // Ensure healthy database connection before proceeding
  await DatabaseConnection.ensureHealthyConnection()

  const { searchParams } = new URL(request.url)
  const filters = validateRequest(taskFiltersSchema, Object.fromEntries(searchParams), "Task filters")
  const paginationParams = createPaginationParams(searchParams)

  // Use optimized database service with enhanced connection management
  const result = await OptimizedDbService.getTasks(
    session.user.tenantId,
    session.user.id,
    {
      ...filters,
      limit: paginationParams.limit,
      offset: paginationParams.offset,
    }
  )

  // Reduced audit logging frequency to minimize database load
  if (Math.random() < 0.05) { // Log 5% of requests (reduced from 10%)
    try {
      await auditLogger.logDataAccess(
        session.user.tenantId,
        session.user.id,
        "task",
        "READ",
        result.tasks.length,
        request
      )
    } catch (auditError) {
      // Don't fail the request if audit logging fails
      console.warn('Audit logging failed:', auditError)
    }
  }

  // Create paginated response
  const paginatedResult = createPaginationResult(
    result.tasks,
    paginationParams,
    result.totalCount
  )

  return NextResponse.json(paginatedResult)
}, "getTasks")

// Create new task with improved connection management
export const POST = withErrorHandling(async (request: NextRequest) => {
  const session = await getServerSession(authOptions)
  requireAuth(session)

  // Ensure healthy database connection before proceeding
  await DatabaseConnection.ensureHealthyConnection()

  const body = await request.json()
  const validatedData = validateRequest(createTaskSchema, body, "Task creation")

  // Validate related entities belong to user with optimized queries
  const validationPromises = []
  
  if (validatedData.projectId) {
    validationPromises.push(
      DatabaseConnection.withRetry(
        () => prisma.project.findFirst({
          where: {
            id: validatedData.projectId,
            userId: session.user.id,
            tenantId: session.user.tenantId,
          },
          select: { id: true } // Only select what we need
        }),
        'validate-project'
      ).then(project => {
        requireResource(project, "Project")
        return project
      })
    )
  }

  if (validatedData.contextId) {
    validationPromises.push(
      DatabaseConnection.withRetry(
        () => prisma.context.findFirst({
          where: {
            id: validatedData.contextId,
            userId: session.user.id,
            tenantId: session.user.tenantId,
          },
          select: { id: true } // Only select what we need
        }),
        'validate-context'
      ).then(context => {
        requireResource(context, "Context")
        return context
      })
    )
  }

  if (validatedData.areaId) {
    validationPromises.push(
      DatabaseConnection.withRetry(
        () => prisma.area.findFirst({
          where: {
            id: validatedData.areaId,
            userId: session.user.id,
            tenantId: session.user.tenantId,
          },
          select: { id: true } // Only select what we need
        }),
        'validate-area'
      ).then(area => {
        requireResource(area, "Area")
        return area
      })
    )
  }

  // Wait for all validations to complete
  if (validationPromises.length > 0) {
    await Promise.all(validationPromises)
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

  // Create task with retry logic
  const task = await DatabaseConnection.withRetry(
    () => prisma.task.create({
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
    }),
    'create-task'
  )

  // Log task creation (with error handling)
  try {
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
  } catch (auditError) {
    // Don't fail the request if audit logging fails
    console.warn('Audit logging failed:', auditError)
  }

  // Invalidate relevant caches
  try {
    await OptimizedDbService.invalidateUserCaches(session.user.tenantId, session.user.id)
  } catch (cacheError) {
    // Don't fail the request if cache invalidation fails
    console.warn('Cache invalidation failed:', cacheError)
  }

  return NextResponse.json(
    { 
      message: "Task created successfully",
      task 
    },
    { status: 201 }
  )
}, "createTask")