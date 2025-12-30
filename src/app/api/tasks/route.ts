import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { auditLogger } from "@/lib/audit-logger"
import { OptimizedDbService } from "@/lib/db-optimized"
import { BatchOperations } from "@/lib/db-batch-operations"
import { createPaginationParams, createPaginationResult } from "@/lib/pagination"
import { 
  withErrorHandling, 
  validateRequest, 
  requireAuth, 
  requireResource 
} from "@/lib/api-error-handler"
import { ValidationError } from "@/lib/errors"
import { DatabaseConnection } from "@/lib/db-connection"
import { NotificationScheduler } from "@/lib/email/scheduler"

const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(500, "Title too long"),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  dueDate: z.string().optional(),
  projectId: z.string().optional(),
  contextId: z.string().optional(),
  areaId: z.string().optional(),
  tags: z.array(z.string()).default([]),
  reminderEnabled: z.boolean().default(false),
  reminderDays: z.number().min(1).max(30).optional(),
})

const taskFiltersSchema = z.object({
  status: z.enum(["active", "completed", "archived", "all"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  projectId: z.string().optional(),
  contextId: z.string().optional(),
  areaId: z.string().optional(),
  dueDate: z.enum(["today", "overdue", "upcoming", "no-due-date", "focus"]).optional(),
  search: z.string().optional(),
  limit: z.string().transform(Number).optional(),
  offset: z.string().transform(Number).optional(),
  includeCompleted: z.enum(["none", "1day", "7days", "30days"]).optional(),
})

// Get tasks with filtering and improved connection management
export const GET = withErrorHandling(async (request: NextRequest) => {
  console.log('📋 Tasks API: Starting request processing')
  
  const session = await getServerSession(authOptions)
  requireAuth(session)

  console.log('📋 Tasks API: Session validated for user:', session.user.id)

  // Ensure healthy database connection before proceeding
  try {
    await DatabaseConnection.ensureHealthyConnection()
    console.log('📋 Tasks API: Database connection verified')
  } catch (dbError) {
    console.error('📋 Tasks API: Database connection failed:', dbError)
    throw dbError
  }
  await DatabaseConnection.ensureHealthyConnection()

  const { searchParams } = new URL(request.url)
  const filters = validateRequest(taskFiltersSchema, Object.fromEntries(searchParams), "Task filters")
  const paginationParams = createPaginationParams(searchParams)

  console.log('📋 Tasks API: Filters validated:', { filters, paginationParams })

  // Use new timezone-aware task filter service
  try {
    const { TaskFilterService } = await import('@/lib/task-filter-service')
    
    const result = await TaskFilterService.getFilteredTasks(
      session.user.tenantId,
      session.user.id,
      {
        ...filters,
        limit: paginationParams.limit,
        offset: paginationParams.offset,
      }
    )

    console.log('📋 Tasks API: Tasks retrieved successfully:', { 
      taskCount: result.tasks.length, 
      totalCount: result.totalCount 
    })

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

    console.log('📋 Tasks API: Response prepared successfully')
    return NextResponse.json(paginatedResult)
    
  } catch (tasksError) {
    console.error('📋 Tasks API: Error retrieving tasks:', tasksError)
    throw tasksError
  }
}, "getTasks")

// Create new task with improved connection management
export const POST = withErrorHandling(async (request: NextRequest) => {
  const session = await getServerSession(authOptions)
  requireAuth(session)

  // Ensure healthy database connection before proceeding
  await DatabaseConnection.ensureHealthyConnection()

  const body = await request.json()
  const validatedData = validateRequest(createTaskSchema, body, "Task creation")

  // Validate related entities belong to user with optimized batch queries
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
      throw new Error("Project not found")
    }
    if (validatedData.contextId && !entityValidation.validContexts.has(validatedData.contextId)) {
      throw new Error("Context not found")
    }
    if (validatedData.areaId && !entityValidation.validAreas.has(validatedData.areaId)) {
      throw new Error("Area not found")
    }
  }

  // Validate and convert dueDate if provided using timezone-aware conversion
  let dueDate: Date | null = null
  if (validatedData.dueDate) {
    // Import timezone service
    const { TimezoneService } = await import('@/lib/timezone-service')
    
    // Handle both YYYY-MM-DD and full datetime formats
    if (/^\d{4}-\d{2}-\d{2}$/.test(validatedData.dueDate)) {
      // Date format (YYYY-MM-DD) - convert using user's timezone
      dueDate = TimezoneService.convertToUTC(validatedData.dueDate, await TimezoneService.getUserTimezone(session.user.id))
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
        originalDueDate: dueDate, // Set original due date when task is created
        projectId: validatedData.projectId,
        contextId: validatedData.contextId,
        areaId: validatedData.areaId,
        tags: validatedData.tags,
        reminderEnabled: validatedData.reminderEnabled,
        reminderDays: validatedData.reminderDays,
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

  // Schedule reminder if enabled and has due date
  if (validatedData.reminderEnabled && dueDate && validatedData.reminderDays) {
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

      await NotificationScheduler.scheduleTaskReminder(
        session.user.id,
        session.user.tenantId,
        task.id,
        dueDate,
        validatedData.reminderDays,
        userTimezone
      );
    } catch (reminderError) {
      // Don't fail task creation if reminder scheduling fails
      console.warn('Failed to schedule task reminder:', reminderError);
    }
  }

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