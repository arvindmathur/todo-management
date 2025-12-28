import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { auditLogger } from "@/lib/audit-logger"
import { securityMiddleware } from "@/lib/security-middleware"

// Get audit statistics
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Check for suspicious activity
    const suspiciousActivity = await securityMiddleware.detectSuspiciousActivity(
      request,
      session.user.tenantId,
      session.user.id
    )

    if (suspiciousActivity.suspicious) {
      return NextResponse.json(
        { error: "Suspicious activity detected" },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    const stats = await auditLogger.getAuditStats(
      session.user.tenantId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined
    )

    // Log stats access
    await auditLogger.logDataAccess(
      session.user.tenantId,
      session.user.id,
      "audit_stats",
      "READ",
      undefined,
      request
    )

    return NextResponse.json(stats)
  } catch (error) {
    console.error("Get audit stats error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}