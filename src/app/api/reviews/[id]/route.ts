import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { DatabaseConnection } from "@/lib/db-connection"

const updateReviewSchema = z.object({
  projectsReviewed: z.array(z.string()).optional(),
  areasReviewed: z.array(z.string()).optional(),
  notes: z.string().optional(),
  nextWeekFocus: z.string().optional(),
  status: z.enum(["in_progress", "completed"]).optional(),
})

// Update weekly review
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

    const tenantId = session.user.tenantId

    const body = await request.json()
    const validatedData = updateReviewSchema.parse(body)

    // Get current review
    const currentReview = await DatabaseConnection.withRetry(
      () => prisma.weeklyReview.findFirst({
        where: {
          id: params.id,
          tenantId,
          userId: session.user.id
        }
      }),
      'get-review-for-update'
    )

    if (!currentReview) {
      return NextResponse.json(
        { error: "Review not found" },
        { status: 404 }
      )
    }

    // Merge review data
    const currentData = currentReview.reviewData as any || {}
    const updatedData = {
      ...currentData,
      ...(validatedData.projectsReviewed !== undefined && { projectsReviewed: validatedData.projectsReviewed }),
      ...(validatedData.areasReviewed !== undefined && { areasReviewed: validatedData.areasReviewed }),
      ...(validatedData.notes !== undefined && { notes: validatedData.notes }),
      ...(validatedData.nextWeekFocus !== undefined && { nextWeekFocus: validatedData.nextWeekFocus }),
    }

    // Prepare update data
    const updateData: any = {
      reviewData: updatedData,
      updatedAt: new Date()
    }

    // Handle completion
    if (validatedData.status === "completed") {
      updateData.status = "completed"
      updateData.completedAt = new Date()
    }

    // Update review
    const updatedReview = await DatabaseConnection.withRetry(
      () => prisma.weeklyReview.update({
        where: { id: params.id },
        data: updateData
      }),
      'update-review'
    )

    return NextResponse.json({
      message: "Review updated successfully",
      review: updatedReview
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Update review error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// Delete weekly review
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

    const tenantId = session.user.tenantId
    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant not found" },
        { status: 404 }
      )
    }

    // Verify ownership and delete
    const deletedReview = await DatabaseConnection.withRetry(
      () => prisma.weeklyReview.deleteMany({
        where: {
          id: params.id,
          tenantId,
          userId: session.user.id
        }
      }),
      'delete-review'
    )

    if (deletedReview.count === 0) {
      return NextResponse.json(
        { error: "Review not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      message: "Review deleted successfully"
    })
  } catch (error) {
    console.error("Delete review error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}