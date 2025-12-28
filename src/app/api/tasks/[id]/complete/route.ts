import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { updateProjectCompletion } from "@/lib/tasks"

// Mark task as complete
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

    // Check if task exists and belongs to user
    const existingTask = await prisma.task.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
        tenantId: session.user.tenantId,
      }
    })

    if (!existingTask) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      )
    }

    if (existingTask.status === "completed") {
      return NextResponse.json(
        { error: "Task is already completed" },
        { status: 400 }
      )
    }

    const task = await prisma.task.update({
      where: { id: params.id },
      data: {
        status: "completed",
        completedAt: new Date(),
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

    // Update project completion status if task belongs to a project
    if (existingTask.projectId) {
      await updateProjectCompletion(
        existingTask.projectId,
        session.user.id,
        session.user.tenantId
      )
    }

    return NextResponse.json({
      message: "Task completed successfully",
      task
    })
  } catch (error) {
    console.error("Complete task error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// Mark task as incomplete (reopen)
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

    // Check if task exists and belongs to user
    const existingTask = await prisma.task.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
        tenantId: session.user.tenantId,
      }
    })

    if (!existingTask) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      )
    }

    if (existingTask.status !== "completed") {
      return NextResponse.json(
        { error: "Task is not completed" },
        { status: 400 }
      )
    }

    const task = await prisma.task.update({
      where: { id: params.id },
      data: {
        status: "active",
        completedAt: null,
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

    // Update project completion status if task belongs to a project
    if (existingTask.projectId) {
      await updateProjectCompletion(
        existingTask.projectId,
        session.user.id,
        session.user.tenantId
      )
    }

    return NextResponse.json({
      message: "Task reopened successfully",
      task
    })
  } catch (error) {
    console.error("Reopen task error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}