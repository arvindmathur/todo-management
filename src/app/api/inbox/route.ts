import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { auditLogger } from "@/lib/audit-logger"
import { 
  withErrorHandling, 
  validateRequest, 
  requireAuth 
} from "@/lib/api-error-handler"

const createInboxItemSchema = z.object({
  content: z.string().min(1, "Content is required").max(2000, "Content too long"),
})

const inboxFiltersSchema = z.object({
  processed: z.string().transform(val => val === "true").optional(),
  search: z.string().optional(),
  limit: z.string().transform(Number).optional(),
  offset: z.string().transform(Number).optional(),
})

// Get inbox items with filtering
export const GET = withErrorHandling(async (request: NextRequest) => {
  const session = await getServerSession(authOptions)
  requireAuth(session)

  const { searchParams } = new URL(request.url)
  const filters = validateRequest(inboxFiltersSchema, Object.fromEntries(searchParams), "Inbox filters")

  // Build where clause
  const where: any = {
    userId: session.user.id,
    tenantId: session.user.tenantId,
  }

  // Apply filters
  if (filters.processed !== undefined) {
    where.processed = filters.processed
  } else {
    // Default to unprocessed items only
    where.processed = false
  }

  if (filters.search) {
    where.content = {
      contains: filters.search,
      mode: 'insensitive'
    }
  }

  const inboxItems = await prisma.inboxItem.findMany({
    where,
    orderBy: [
      { processed: "asc" }, // Unprocessed items first
      { createdAt: "desc" } // Newest first
    ],
    take: filters.limit || 100,
    skip: filters.offset || 0,
  })

  // Get count of unprocessed items for the counter
  const unprocessedCount = await prisma.inboxItem.count({
    where: {
      userId: session.user.id,
      tenantId: session.user.tenantId,
      processed: false,
    }
  })

  // Log data access
  await auditLogger.logDataAccess(
    session.user.tenantId,
    session.user.id,
    "inbox_item",
    "READ",
    inboxItems.length,
    request
  )

  return NextResponse.json({ 
    inboxItems,
    unprocessedCount,
    total: inboxItems.length
  })
}, "getInboxItems")

// Create new inbox item (capture)
export const POST = withErrorHandling(async (request: NextRequest) => {
  const session = await getServerSession(authOptions)
  requireAuth(session)

  const body = await request.json()
  const validatedData = validateRequest(createInboxItemSchema, body, "Inbox item creation")

  const inboxItem = await prisma.inboxItem.create({
    data: {
      ...validatedData,
      userId: session.user.id,
      tenantId: session.user.tenantId,
      processed: false,
    }
  })

  // Get updated unprocessed count
  const unprocessedCount = await prisma.inboxItem.count({
    where: {
      userId: session.user.id,
      tenantId: session.user.tenantId,
      processed: false,
    }
  })

  // Log inbox item creation
  await auditLogger.logCreate(
    session.user.tenantId,
    session.user.id,
    "inbox_item",
    inboxItem.id,
    {
      contentLength: inboxItem.content.length
    },
    request
  )

  return NextResponse.json(
    { 
      message: "Item added to inbox successfully",
      inboxItem,
      unprocessedCount
    },
    { status: 201 }
  )
}, "createInboxItem")