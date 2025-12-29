import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import jwt from "jsonwebtoken"
import nodemailer from "nodemailer"
import { prisma } from "@/lib/prisma"
import { DatabaseConnection } from "@/lib/db-connection"

const resetRequestSchema = z.object({
  email: z.string().email("Invalid email address"),
})

const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(8, "Password must be at least 8 characters"),
})

// Request password reset
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = resetRequestSchema.parse(body)

    // Check if user exists
    const user = await DatabaseConnection.withRetry(
      () => prisma.user.findUnique({
        where: { email }
      }),
      'find-user-for-reset'
    )

    if (!user) {
      // Don't reveal if user exists or not for security
      return NextResponse.json(
        { message: "If an account with that email exists, a reset link has been sent." },
        { status: 200 }
      )
    }

    // Generate reset token
    const resetToken = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.NEXTAUTH_SECRET!,
      { expiresIn: '1h' }
    )

    // Create reset URL
    const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${resetToken}`

    // Send email (if email configuration is available)
    if (process.env.EMAIL_SERVER_HOST) {
      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_SERVER_HOST,
        port: parseInt(process.env.EMAIL_SERVER_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      })

      await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: email,
        subject: "Password Reset Request",
        html: `
          <h2>Password Reset Request</h2>
          <p>You requested a password reset for your Todo Management account.</p>
          <p>Click the link below to reset your password:</p>
          <a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this reset, please ignore this email.</p>
        `,
      })
    }

    return NextResponse.json(
      { message: "If an account with that email exists, a reset link has been sent." },
      { status: 200 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Password reset request error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// Reset password with token
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, password } = resetPasswordSchema.parse(body)

    // Verify token
    const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET!) as {
      userId: string
      email: string
    }

    // Hash new password
    const bcrypt = require('bcryptjs')
    const hashedPassword = await bcrypt.hash(password, 12)

    // Update user password
    await DatabaseConnection.withRetry(
      () => prisma.user.update({
        where: { id: decoded.userId },
        data: { password: hashedPassword }
      }),
      'update-user-password'
    )

    return NextResponse.json(
      { message: "Password reset successfully" },
      { status: 200 }
    )
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return NextResponse.json(
        { error: "Invalid or expired reset token" },
        { status: 400 }
      )
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Password reset error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}