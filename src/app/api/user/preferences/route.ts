import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { DatabaseConnection } from "@/lib/db-connection"

const preferencesSchema = z.object({
  completedTaskRetention: z.union([
    z.literal(30),
    z.literal(90),
    z.literal(365),
    z.literal(-1)
  ]).optional(),
  completedTaskVisibility: z.enum(["none", "1day", "7days", "30days"]).optional(),
  defaultView: z.enum(["simple", "gtd"]).optional(),
  theme: z.enum(["light", "dark", "system"]).optional(),
  notifications: z.object({
    email: z.boolean().optional(),
    browser: z.boolean().optional(),
    weeklyReview: z.boolean().optional(),
  }).optional(),
  emailNotifications: z.object({
    summaryEnabled: z.boolean().optional(),
    summaryFrequency: z.enum(["daily", "weekly"]).optional(),
    remindersEnabled: z.boolean().optional(),
    defaultReminderDays: z.number().min(1).max(30).optional(),
  }).optional(),
  gtdEnabled: z.boolean().optional(),
  gtdOnboardingCompleted: z.boolean().optional(),
  // Task preferences
  taskDefaults: z.object({
    priority: z.enum(["urgent", "high", "medium", "low"]).optional(),
    dueDate: z.enum(["today", "tomorrow", "none"]).optional(),
  }).optional(),
  taskSorting: z.object({
    primary: z.enum(["priority", "dueDate", "title", "created"]).optional(),
    primaryOrder: z.enum(["asc", "desc"]).optional(),
    secondary: z.enum(["priority", "dueDate", "title", "created"]).optional(),
    secondaryOrder: z.enum(["asc", "desc"]).optional(),
    tertiary: z.enum(["priority", "dueDate", "title", "created"]).optional(),
    tertiaryOrder: z.enum(["asc", "desc"]).optional(),
  }).optional(),
  // Regional preferences
  timezone: z.string().optional(),
  dateFormat: z.enum(["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"]).optional(),
  timeFormat: z.enum(["12h", "24h"]).optional(),
})

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
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

    const user = await DatabaseConnection.withRetry(
      () => prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          id: true,
          gtdEnabled: true,
          preferences: true,
        }
      }),
      'get-user-preferences'
    )

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    // Ensure preferences is always an object, even if null in database
    const preferences = user.preferences || {}

    return NextResponse.json({
      gtdEnabled: user.gtdEnabled,
      preferences: preferences,
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
    const currentUser = await DatabaseConnection.withRetry(
      () => prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          preferences: true,
          gtdEnabled: true,
        }
      }),
      'get-current-user-preferences'
    )

    if (!currentUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    // Merge preferences - handle case where preferences might be null or empty
    const currentPreferences = (currentUser.preferences as any) || {}
    const updatedPreferences = { ...currentPreferences }

    // Update individual preference fields
    if (validatedData.completedTaskRetention !== undefined) {
      updatedPreferences.completedTaskRetention = validatedData.completedTaskRetention
    }
    if (validatedData.completedTaskVisibility !== undefined) {
      updatedPreferences.completedTaskVisibility = validatedData.completedTaskVisibility
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
    if (validatedData.emailNotifications !== undefined) {
      updatedPreferences.emailNotifications = {
        ...updatedPreferences.emailNotifications,
        ...validatedData.emailNotifications
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
    if (validatedData.timezone !== undefined) {
      updatedPreferences.timezone = validatedData.timezone
    }
    if (validatedData.dateFormat !== undefined) {
      updatedPreferences.dateFormat = validatedData.dateFormat
    }
    if (validatedData.timeFormat !== undefined) {
      updatedPreferences.timeFormat = validatedData.timeFormat
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
    const updatedUser = await DatabaseConnection.withRetry(
      () => prisma.user.update({
        where: { id: session.user.id },
        data: updateData,
        select: {
          id: true,
          gtdEnabled: true,
          preferences: true,
        }
      }),
      'update-user-preferences'
    )

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