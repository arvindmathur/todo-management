import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// Mark project as complete
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

    // Check if project exists and belongs to user
    const existingProject = await prisma.project.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
        tenantId: session.user.tenantId,
      },
      include: {
        tasks: {
          select: {
            id: true,
            status: true,
          }
        }
      }
    })

    if (!existingProject) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      )
    }

    // Check if all tasks are completed
    const activeTasks = existingProject.tasks.filter(task => task.status === "active")
    if (activeTasks.length > 0) {
      return NextResponse.json(
        { 
          error: "Cannot complete project with active tasks",
          activeTasks: activeTasks.length,
          message: "Complete all tasks before marking project as complete"
        },
        { status: 400 }
      )
    }

    const project = await prisma.project.update({
      where: { id: params.id },
      data: { 
        status: "completed",
        updatedAt: new Date()
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

    // Calculate final progress (should be 100%)
    const totalTasks = project.tasks.length
    const completedTasks = project.tasks.filter(task => task.status === "completed").length
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 100

    const projectWithProgress = {
      ...project,
      progress,
      totalTasks,
      completedTasks,
      nextAction: null // No next action for completed project
    }

    return NextResponse.json({
      message: "Project completed successfully",
      project: projectWithProgress
    })
  } catch (error) {
    console.error("Complete project error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// Reopen project (mark as active)
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

    // Check if project exists and belongs to user
    const existingProject = await prisma.project.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
        tenantId: session.user.tenantId,
      }
    })

    if (!existingProject) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      )
    }

    const project = await prisma.project.update({
      where: { id: params.id },
      data: { 
        status: "active",
        updatedAt: new Date()
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

    // Calculate progress
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

    return NextResponse.json({
      message: "Project reopened successfully",
      project: projectWithProgress
    })
  } catch (error) {
    console.error("Reopen project error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}