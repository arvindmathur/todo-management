import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { DatabaseConnection } from "@/lib/db-connection"

// Get unprocessed inbox item count
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const unprocessedCount = await DatabaseConnection.withRetry(
      () => prisma.inboxItem.count({
        where: {
          userId: session.user.id,
          tenantId: session.user.tenantId,
          processed: false,
        }
      }),
      'get-unprocessed-inbox-count'
    )

    const totalCount = await DatabaseConnection.withRetry(
      () => prisma.inboxItem.count({
        where: {
          userId: session.user.id,
          tenantId: session.user.tenantId,
        }
      }),
      'get-total-inbox-count'
    )

    const processedCount = totalCount - unprocessedCount

    return NextResponse.json({ 
      unprocessedCount,
      processedCount,
      totalCount,
      processingRate: totalCount > 0 ? Math.round((processedCount / totalCount) * 100) : 0
    })
  } catch (error) {
    console.error("Get inbox count error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}