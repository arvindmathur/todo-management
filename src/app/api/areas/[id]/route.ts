import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const updateAreaSchema = z.object({
  name: z.string().min(1, "Area name is required").max(100, "Area name too long").optional(),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, "Color must be a valid hex color").optional(),
})

// Get single area
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

    const area = await prisma.area.findFirst({
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
        projects: {
          where: {
            status: "active" // Only include active projects
          },
          select: {
            id: true,
            name: true,
            description: true,
            status: true,
            outcome: true,
            createdAt: true,
          },
          orderBy: [
            { createdAt: "desc" }
          ]
        },
        _count: {
          select: {
            tasks: {
              where: {
                status: "active"
              }
            },
            projects: {
              where: {
                status: "active"
              }
            }
          }
        }
      }
    })

    if (!area) {
      return NextResponse.json(
        { error: "Area not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ area })
  } catch (error) {
    console.error("Get area error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// Update area
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
    const validatedData = updateAreaSchema.parse(body)

    // Check if area exists and belongs to user
    const existingArea = await prisma.area.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
        tenantId: session.user.tenantId,
      }
    })

    if (!existingArea) {
      return NextResponse.json(
        { error: "Area not found" },
        { status: 404 }
      )
    }

    // Check if new name conflicts with existing area (if name is being changed)
    if (validatedData.name && validatedData.name !== existingArea.name) {
      const nameConflict = await prisma.area.findFirst({
        where: {
          name: validatedData.name,
          userId: session.user.id,
          tenantId: session.user.tenantId,
          id: { not: params.id }
        }
      })

      if (nameConflict) {
        return NextResponse.json(
          { error: "Area with this name already exists" },
          { status: 400 }
        )
      }
    }

    const area = await prisma.area.update({
      where: { id: params.id },
      data: validatedData,
      include: {
        _count: {
          select: {
            tasks: {
              where: {
                status: "active"
              }
            },
            projects: {
              where: {
                status: "active"
              }
            }
          }
        }
      }
    })

    return NextResponse.json({
      message: "Area updated successfully",
      area
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Update area error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// Delete area
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

    // Check if area exists and belongs to user
    const existingArea = await prisma.area.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
        tenantId: session.user.tenantId,
      },
      include: {
        tasks: {
          select: { id: true }
        },
        projects: {
          select: { id: true }
        }
      }
    })

    if (!existingArea) {
      return NextResponse.json(
        { error: "Area not found" },
        { status: 404 }
      )
    }

    // Unassign area from all associated tasks and projects before deletion
    const tasksUnassigned = existingArea.tasks.length
    const projectsUnassigned = existingArea.projects.length

    if (tasksUnassigned > 0) {
      await prisma.task.updateMany({
        where: {
          areaId: params.id,
          userId: session.user.id,
          tenantId: session.user.tenantId,
        },
        data: {
          areaId: null
        }
      })
    }

    if (projectsUnassigned > 0) {
      await prisma.project.updateMany({
        where: {
          areaId: params.id,
          userId: session.user.id,
          tenantId: session.user.tenantId,
        },
        data: {
          areaId: null
        }
      })
    }

    // Delete the area
    await prisma.area.delete({
      where: { id: params.id }
    })

    return NextResponse.json({
      message: "Area deleted successfully",
      tasksUnassigned,
      projectsUnassigned
    })
  } catch (error) {
    console.error("Delete area error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}