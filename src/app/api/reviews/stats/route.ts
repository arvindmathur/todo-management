import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// Get review statistics
export async function GET(request: NextRequest) {
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

    // Get last completed review
    const lastReview = await prisma.weeklyReview.findFirst({
      where: {
        tenantId,
        userId: session.user.id,
        status: "completed"
      },
      orderBy: { completedAt: "desc" }
    })

    // Get total review count
    const totalReviews = await prisma.weeklyReview.count({
      where: {
        tenantId,
        userId: session.user.id,
        status: "completed"
      }
    })

    // Calculate review streak (consecutive weeks with reviews)
    const reviewStreak = await calculateReviewStreak(tenantId, session.user.id)

    // Calculate stats
    const now = new Date()
    const lastReviewDate = lastReview?.completedAt
    const daysSinceLastReview = lastReviewDate 
      ? Math.floor((now.getTime() - new Date(lastReviewDate).getTime()) / (1000 * 60 * 60 * 24))
      : undefined

    // Calculate next review due date (7 days after last review, or now if no previous review)
    const nextReviewDue = lastReviewDate 
      ? new Date(new Date(lastReviewDate).getTime() + (7 * 24 * 60 * 60 * 1000))
      : now

    // A review is overdue if it's been more than 7 days since the last one
    const isOverdue = daysSinceLastReview !== undefined && daysSinceLastReview > 7

    return NextResponse.json({
      lastReviewDate,
      daysSinceLastReview,
      isOverdue,
      nextReviewDue,
      reviewStreak,
      totalReviews
    })
  } catch (error) {
    console.error("Get review stats error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

async function calculateReviewStreak(tenantId: string, userId: string): Promise<number> {
  try {
    // Get all completed reviews ordered by completion date (most recent first)
    const reviews = await prisma.weeklyReview.findMany({
      where: {
        tenantId,
        userId,
        status: "completed"
      },
      select: {
        completedAt: true
      },
      orderBy: { completedAt: "desc" }
    })

    if (reviews.length === 0) return 0

    let streak = 0
    let currentWeekStart = getWeekStart(new Date())

    for (const review of reviews) {
      if (!review.completedAt) continue

      const reviewWeekStart = getWeekStart(new Date(review.completedAt))
      
      // If this review is from the current expected week, increment streak
      if (reviewWeekStart.getTime() === currentWeekStart.getTime()) {
        streak++
        // Move to previous week
        currentWeekStart = new Date(currentWeekStart.getTime() - (7 * 24 * 60 * 60 * 1000))
      } else if (reviewWeekStart.getTime() < currentWeekStart.getTime()) {
        // There's a gap in reviews, streak is broken
        break
      }
      // If reviewWeekStart > currentWeekStart, this review is from a future week (shouldn't happen)
      // but we'll skip it and continue
    }

    return streak
  } catch (error) {
    console.error("Calculate review streak error:", error)
    return 0
  }
}

function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Adjust when day is Sunday
  const weekStart = new Date(d.setDate(diff))
  weekStart.setHours(0, 0, 0, 0)
  return weekStart
}