import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { DatabaseConnection } from "@/lib/db-connection"

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

// Change user password
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
    const validatedData = changePasswordSchema.parse(body)

    // Get current user with password
    const user = await DatabaseConnection.withRetry(
      () => prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          id: true,
          password: true,
        }
      }),
      'get-user-for-password-change'
    )

    if (!user || !user.password) {
      return NextResponse.json(
        { error: "User not found or no password set" },
        { status: 404 }
      )
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      validatedData.currentPassword,
      user.password
    )

    if (!isCurrentPasswordValid) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 400 }
      )
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(validatedData.newPassword, 12)

    // Update password
    await DatabaseConnection.withRetry(
      () => prisma.user.update({
        where: { id: session.user.id },
        data: {
          password: hashedNewPassword,
        }
      }),
      'update-user-password'
    )

    return NextResponse.json({
      message: "Password changed successfully"
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Change password error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}