import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { auditLogger } from "@/lib/audit-logger"
import { 
  withErrorHandling, 
  validateRequest, 
  requireAuth, 
  requireResource 
} from "@/lib/api-error-handler"

const createProjectSchema = z.object({
  name: z.string().min(1, "Project name is required").max(255, "Project name too long"),
  description: z.string().optional(),
  areaId: z.string().optional(),
  outcome: z.string().optional(),
})

const projectFiltersSchema = z.object({
  status: z.enum(["active", "someday", "completed", "archived"]).optional(),
  areaId: z.string().optional(),
  limit: z.string().transform(Number).optional(),
  offset: z.string().transform(Number).optional(),
})

// Get projects with filtering
export const GET = withErrorHandling(async (request: NextRequest) => {
  const session = await getServerSession(authOptions)
  requireAuth(session)

  const { searchParams } = new URL(request.url)
  const filters = validateRequest(projectFiltersSchema, Object.fromEntries(searchParams), "Project filters")

  // Build where clause
  const where: any = {
    userId: session.user.id,
    tenantId: session.user.tenantId,
  }

  // Apply filters
  if (filters.status) {
    where.status = filters.status
  } else {
    // Default to active projects
    where.status = "active"
  }

  if (filters.areaId) {
    where.areaId = filters.areaId
  }

  const projects = await prisma.project.findMany({
    where,
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
        },
        orderBy: [
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
    },
    orderBy: [
      { status: "asc" }, // Active projects first
      { createdAt: "desc" }
    ],
    take: filters.limit || 100,
    skip: filters.offset || 0,
  })

  // Calculate progress for each project
  const projectsWithProgress = projects.map(project => {
    const totalTasks = project.tasks.length
    const completedTasks = project.tasks.filter(task => task.status === "completed").length
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
    
    // Check if project should be auto-completed
    const shouldBeCompleted = totalTasks > 0 && completedTasks === totalTasks && project.status === "active"
    
    return {
      ...project,
      progress,
      totalTasks,
      completedTasks,
      shouldBeCompleted,
      nextAction: project.tasks.find(task => task.status === "active") || null
    }
  })

  // Log data access
  await auditLogger.logDataAccess(
    session.user.tenantId,
    session.user.id,
    "project",
    "READ",
    projects.length,
    request
  )

  return NextResponse.json({ projects: projectsWithProgress })
}, "getProjects")

// Create new project
export const POST = withErrorHandling(async (request: NextRequest) => {
  const session = await getServerSession(authOptions)
  requireAuth(session)

  const body = await request.json()
  const validatedData = validateRequest(createProjectSchema, body, "Project creation")

  // Validate area belongs to user if provided
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

  const project = await prisma.project.create({
    data: {
      ...validatedData,
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
  })

  // Calculate initial progress
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

  // Log project creation
  await auditLogger.logCreate(
    session.user.tenantId,
    session.user.id,
    "project",
    project.id,
    {
      name: project.name,
      areaId: project.areaId
    },
    request
  )

  return NextResponse.json(
    { 
      message: "Project created successfully",
      project: projectWithProgress
    },
    { status: 201 }
  )
}, "createProject")