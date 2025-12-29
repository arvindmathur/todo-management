import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { DatabaseConnection } from "@/lib/db-connection"
import { auditLogger } from "@/lib/audit-logger"
import { 
  withErrorHandling, 
  validateRequest, 
  requireAuth
} from "@/lib/api-error-handler"
import { ConflictError } from "@/lib/errors"

const createContextSchema = z.object({
  name: z.string().min(1, "Context name is required").max(100, "Context name too long"),
  description: z.string().optional(),
  icon: z.string().optional(),
})

const contextFiltersSchema = z.object({
  search: z.string().optional(),
  isDefault: z.string().transform(val => val === "true").optional(),
  limit: z.string().transform(Number).optional(),
  offset: z.string().transform(Number).optional(),
})

// Default contexts that should be created for new users
const DEFAULT_CONTEXTS = [
  { name: "@phone", description: "Tasks that require phone calls", icon: "📞", isDefault: true },
  { name: "@computer", description: "Tasks that require a computer", icon: "💻", isDefault: true },
  { name: "@errands", description: "Tasks to do while out and about", icon: "🚗", isDefault: true },
  { name: "@home", description: "Tasks that can be done at home", icon: "🏠", isDefault: true },
  { name: "@office", description: "Tasks that require being at the office", icon: "🏢", isDefault: true },
]

// Get contexts with filtering
export const GET = withErrorHandling(async (request: NextRequest) => {
  const session = await getServerSession(authOptions)
  requireAuth(session)

  const { searchParams } = new URL(request.url)
  const filters = validateRequest(contextFiltersSchema, Object.fromEntries(searchParams), "Context filters")

  // Build where clause
  const where: any = {
    userId: session.user.id,
    tenantId: session.user.tenantId,
  }

  // Apply filters
  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } },
    ]
  }

  if (filters.isDefault !== undefined) {
    where.isDefault = filters.isDefault
  }

  const contexts = await DatabaseConnection.withRetry(
    () => prisma.context.findMany({
      where,
      include: {
        _count: {
          select: {
            tasks: {
              where: {
                status: "active" // Only count active tasks
              }
            }
          }
        }
      },
      orderBy: [
        { isDefault: "desc" }, // Default contexts first
        { name: "asc" }
      ],
      take: filters.limit || 100,
      skip: filters.offset || 0,
    }),
    'get-contexts'
  )

  // Log data access
  await auditLogger.logDataAccess(
    session.user.tenantId,
    session.user.id,
    "context",
    "READ",
    contexts.length,
    request
  )

  return NextResponse.json({ contexts })
}, "getContexts")

// Create new context
export const POST = withErrorHandling(async (request: NextRequest) => {
  const session = await getServerSession(authOptions)
  requireAuth(session)

  const body = await request.json()
  const validatedData = validateRequest(createContextSchema, body, "Context creation")

  // Check if context with same name already exists for this user
  const existingContext = await DatabaseConnection.withRetry(
    () => prisma.context.findFirst({
      where: {
        name: validatedData.name,
        userId: session.user.id,
        tenantId: session.user.tenantId,
      }
    }),
    'check-context-exists'
  )

  if (existingContext) {
    throw new ConflictError("Context with this name already exists")
  }

  const context = await DatabaseConnection.withRetry(
    () => prisma.context.create({
      data: {
        ...validatedData,
        userId: session.user.id,
        tenantId: session.user.tenantId,
        isDefault: false, // User-created contexts are not default
      },
      include: {
        _count: {
          select: {
            tasks: {
              where: {
                status: "active"
              }
            }
          }
        }
      }
    }),
    'create-context'
  )

  // Log context creation
  await auditLogger.logCreate(
    session.user.tenantId,
    session.user.id,
    "context",
    context.id,
    {
      name: context.name,
      isDefault: context.isDefault
    },
    request
  )

  return NextResponse.json(
    { 
      message: "Context created successfully",
      context 
    },
    { status: 201 }
  )
}, "createContext")

// Initialize default contexts for a user
export const PUT = withErrorHandling(async (request: NextRequest) => {
  const session = await getServerSession(authOptions)
  requireAuth(session)

  // Check if user already has default contexts
  const existingContexts = await DatabaseConnection.withRetry(
    () => prisma.context.findMany({
      where: {
        userId: session.user.id,
        tenantId: session.user.tenantId,
        isDefault: true,
      }
    }),
    'check-default-contexts'
  )

  if (existingContexts.length > 0) {
    return NextResponse.json(
      { 
        message: "Default contexts already exist",
        contexts: existingContexts 
      }
    )
  }

  // Create default contexts using batch operations for efficiency
  const contexts = await DatabaseConnection.withRetry(
    () => Promise.all(
      DEFAULT_CONTEXTS.map(contextData =>
        prisma.context.create({
          data: {
            ...contextData,
            userId: session.user.id,
            tenantId: session.user.tenantId,
          },
          include: {
            _count: {
              select: {
                tasks: {
                  where: {
                    status: "active"
                  }
                }
              }
            }
          }
        })
      )
    ),
    'create-default-contexts'
  )

  // Log default contexts creation
  await auditLogger.logCreate(
    session.user.tenantId,
    session.user.id,
    "context",
    "default_contexts",
    {
      count: contexts.length,
      contexts: contexts.map(c => c.name)
    },
    request
  )

  return NextResponse.json(
    { 
      message: "Default contexts created successfully",
      contexts 
    },
    { status: 201 }
  )
}, "initializeDefaultContexts")