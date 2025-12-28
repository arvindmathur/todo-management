import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const updateContextSchema = z.object({
  name: z.string().min(1, "Context name is required").max(100, "Context name too long").optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
})

// Get single context
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

    const context = await prisma.context.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
        tenantId: session.user.tenantId,
      },
      include: {
        tasks: {
          where: {
            status: "active" // Only include active tasks
          },
          select: {
            id: true,
            title: true,
            description: true,
            status: true,
            priority: true,
            dueDate: true,
            createdAt: true,
          },
          orderBy: [
            { priority: "desc" },
            { dueDate: "asc" },
            { createdAt: "desc" }
          ]
        },
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

    if (!context) {
      return NextResponse.json(
        { error: "Context not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ context })
  } catch (error) {
    console.error("Get context error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// Update context
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
    const validatedData = updateContextSchema.parse(body)

    // Check if context exists and belongs to user
    const existingContext = await prisma.context.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
        tenantId: session.user.tenantId,
      }
    })

    if (!existingContext) {
      return NextResponse.json(
        { error: "Context not found" },
        { status: 404 }
      )
    }

    // Check if new name conflicts with existing context (if name is being changed)
    if (validatedData.name && validatedData.name !== existingContext.name) {
      const nameConflict = await prisma.context.findFirst({
        where: {
          name: validatedData.name,
          userId: session.user.id,
          tenantId: session.user.tenantId,
          id: { not: params.id }
        }
      })

      if (nameConflict) {
        return NextResponse.json(
          { error: "Context with this name already exists" },
          { status: 400 }
        )
      }
    }

    const context = await prisma.context.update({
      where: { id: params.id },
      data: validatedData,
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

    return NextResponse.json({
      message: "Context updated successfully",
      context
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Update context error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// Delete context
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

    // Check if context exists and belongs to user
    const existingContext = await prisma.context.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
        tenantId: session.user.tenantId,
      },
      include: {
        tasks: {
          select: { id: true }
        }
      }
    })

    if (!existingContext) {
      return NextResponse.json(
        { error: "Context not found" },
        { status: 404 }
      )
    }

    // Unassign context from all associated tasks before deletion
    if (existingContext.tasks.length > 0) {
      await prisma.task.updateMany({
        where: {
          contextId: params.id,
          userId: session.user.id,
          tenantId: session.user.tenantId,
        },
        data: {
          contextId: null
        }
      })
    }

    // Delete the context
    await prisma.context.delete({
      where: { id: params.id }
    })

    return NextResponse.json({
      message: "Context deleted successfully",
      tasksUnassigned: existingContext.tasks.length
    })
  } catch (error) {
    console.error("Delete context error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}