import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { DatabaseConnection } from "@/lib/db-connection"

const updateInboxItemSchema = z.object({
  content: z.string().min(1, "Content is required").max(2000, "Content too long").optional(),
})

// Get single inbox item
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

    const inboxItem = await DatabaseConnection.withRetry(
      () => prisma.inboxItem.findFirst({
        where: {
          id: params.id,
          userId: session.user.id,
          tenantId: session.user.tenantId,
        }
      }),
      'get-inbox-item-by-id'
    )

    if (!inboxItem) {
      return NextResponse.json(
        { error: "Inbox item not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ inboxItem })
  } catch (error) {
    console.error("Get inbox item error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// Update inbox item
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
    const validatedData = updateInboxItemSchema.parse(body)

    // Check if inbox item exists and belongs to user
    const existingItem = await DatabaseConnection.withRetry(
      () => prisma.inboxItem.findFirst({
        where: {
          id: params.id,
          userId: session.user.id,
          tenantId: session.user.tenantId,
        }
      }),
      'check-inbox-item-exists'
    )

    if (!existingItem) {
      return NextResponse.json(
        { error: "Inbox item not found" },
        { status: 404 }
      )
    }

    const inboxItem = await DatabaseConnection.withRetry(
      () => prisma.inboxItem.update({
        where: { id: params.id },
        data: validatedData,
      }),
      'update-inbox-item'
    )

    return NextResponse.json({
      message: "Inbox item updated successfully",
      inboxItem
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Update inbox item error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// Delete inbox item
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

    // Check if inbox item exists and belongs to user
    const existingItem = await DatabaseConnection.withRetry(
      () => prisma.inboxItem.findFirst({
        where: {
          id: params.id,
          userId: session.user.id,
          tenantId: session.user.tenantId,
        }
      }),
      'check-inbox-item-for-delete'
    )

    if (!existingItem) {
      return NextResponse.json(
        { error: "Inbox item not found" },
        { status: 404 }
      )
    }

    // Delete the inbox item and get updated count in parallel
    const [, unprocessedCount] = await Promise.all([
      DatabaseConnection.withRetry(
        () => prisma.inboxItem.delete({
          where: { id: params.id }
        }),
        'delete-inbox-item'
      ),
      DatabaseConnection.withRetry(
        () => prisma.inboxItem.count({
          where: {
            userId: session.user.id,
            tenantId: session.user.tenantId,
            processed: false,
          }
        }),
        'count-unprocessed-after-delete'
      )
    ])

    return NextResponse.json({
      message: "Inbox item deleted successfully",
      unprocessedCount
    })
  } catch (error) {
    console.error("Delete inbox item error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}