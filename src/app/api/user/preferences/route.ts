import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const preferencesSchema = z.object({
  completedTaskRetention: z.union([
    z.literal(30),
    z.literal(90),
    z.literal(365),
    z.literal(-1)
  ]).optional(),
  defaultView: z.enum(["simple", "gtd"]).optional(),
  theme: z.enum(["light", "dark", "system"]).optional(),
  notifications: z.object({
    email: z.boolean().optional(),
    browser: z.boolean().optional(),
    weeklyReview: z.boolean().optional(),
  }).optional(),
  gtdEnabled: z.boolean().optional(),
  gtdOnboardingCompleted: z.boolean().optional(),
  // New task preferences
  taskDefaults: z.object({
    priority: z.enum(["urgent", "high", "medium", "low"]).optional(),
    dueDate: z.enum(["today", "tomorrow", "none"]).optional(),
  }).optional(),
  taskSorting: z.object({
    primary: z.enum(["priority", "dueDate", "title", "created"]).optional(),
    secondary: z.enum(["priority", "dueDate", "title", "created"]).optional(),
    tertiary: z.enum(["priority", "dueDate", "title", "created"]).optional(),
  }).optional(),
})

// Get user preferences
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        gtdEnabled: true,
        preferences: true,
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      gtdEnabled: user.gtdEnabled,
      preferences: user.preferences,
    })
  } catch (error) {
    console.error("Get preferences error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// Update user preferences
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedData = preferencesSchema.parse(body)

    // Get current user data
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        preferences: true,
        gtdEnabled: true,
      }
    })

    if (!currentUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    // Merge preferences
    const currentPreferences = currentUser.preferences as any || {}
    const updatedPreferences = { ...currentPreferences }

    // Update individual preference fields
    if (validatedData.completedTaskRetention !== undefined) {
      updatedPreferences.completedTaskRetention = validatedData.completedTaskRetention
    }
    if (validatedData.defaultView !== undefined) {
      updatedPreferences.defaultView = validatedData.defaultView
    }
    if (validatedData.theme !== undefined) {
      updatedPreferences.theme = validatedData.theme
    }
    if (validatedData.notifications !== undefined) {
      updatedPreferences.notifications = {
        ...updatedPreferences.notifications,
        ...validatedData.notifications
      }
    }
    if (validatedData.gtdOnboardingCompleted !== undefined) {
      updatedPreferences.gtdOnboardingCompleted = validatedData.gtdOnboardingCompleted
    }
    if (validatedData.taskDefaults !== undefined) {
      updatedPreferences.taskDefaults = {
        ...updatedPreferences.taskDefaults,
        ...validatedData.taskDefaults
      }
    }
    if (validatedData.taskSorting !== undefined) {
      updatedPreferences.taskSorting = {
        ...updatedPreferences.taskSorting,
        ...validatedData.taskSorting
      }
    }

    // Prepare update data
    const updateData: any = {
      preferences: updatedPreferences,
    }

    // Handle GTD mode toggle
    if (validatedData.gtdEnabled !== undefined) {
      updateData.gtdEnabled = validatedData.gtdEnabled
      
      // If enabling GTD for the first time, set default view to GTD
      if (validatedData.gtdEnabled && !currentUser.gtdEnabled) {
        updatedPreferences.defaultView = "gtd"
        updateData.preferences = updatedPreferences
      }
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: {
        id: true,
        gtdEnabled: true,
        preferences: true,
      }
    })

    return NextResponse.json({
      message: "Preferences updated successfully",
      gtdEnabled: updatedUser.gtdEnabled,
      preferences: updatedUser.preferences,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Update preferences error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}