import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { auditLogger } from "@/lib/audit-logger"
import { securityMiddleware, commonValidationRules } from "@/lib/security-middleware"

// Get audit logs with filtering and pagination
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
    const userId = searchParams.get("userId")
    const action = searchParams.get("action")
    const entityType = searchParams.get("entityType")
    const entityId = searchParams.get("entityId")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const limit = parseInt(searchParams.get("limit") || "50")
    const offset = parseInt(searchParams.get("offset") || "0")

    // Validate pagination parameters
    if (limit > 1000) {
      return NextResponse.json(
        { error: "Limit cannot exceed 1000" },
        { status: 400 }
      )
    }

    const filters = {
      userId: userId || undefined,
      action: action || undefined,
      entityType: entityType || undefined,
      entityId: entityId || undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit,
      offset
    }

    const result = await auditLogger.getAuditLogs(session.user.tenantId, filters)

    // Log data access
    await auditLogger.logDataAccess(
      session.user.tenantId,
      session.user.id,
      "audit_log",
      "READ",
      result.logs.length,
      request
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error("Get audit logs error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// Export logs (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Check if user has admin privileges (implement your admin check logic)
    const isAdmin = await checkAdminPrivileges(session.user.id, session.user.tenantId)
    if (!isAdmin) {
      await auditLogger.logSecurityEvent(
        session.user.tenantId,
        session.user.id,
        "UNAUTHORIZED_ACCESS_ATTEMPT",
        { resource: "audit_logs_export" },
        request
      )
      
      return NextResponse.json(
        { error: "Insufficient privileges" },
        { status: 403 }
      )
    }

    const body = await request.json()
    
    // Validate request body
    const validation = securityMiddleware.validateInput(body, {
      startDate: { required: false, type: "string" },
      endDate: { required: false, type: "string" },
      format: { required: false, type: "string" }
    })

    if (!validation.isValid) {
      return NextResponse.json(
        { error: "Invalid input", details: validation.errors },
        { status: 400 }
      )
    }

    const { startDate, endDate, format = "json" } = validation.sanitizedData

    const filters = {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: 10000 // Large limit for export
    }

    const result = await auditLogger.getAuditLogs(session.user.tenantId, filters)

    // Log export action
    await auditLogger.logUserAction(
      session.user.tenantId,
      session.user.id,
      "EXPORT_AUDIT_LOGS",
      "audit_log",
      undefined,
      undefined,
      { count: result.logs.length, format },
      request
    )

    if (format === "csv") {
      const csv = convertToCSV(result.logs)
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.csv"`
        }
      })
    }

    return NextResponse.json({
      logs: result.logs,
      exportedAt: new Date().toISOString(),
      totalCount: result.totalCount
    })
  } catch (error) {
    console.error("Export audit logs error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

async function checkAdminPrivileges(userId: string, tenantId: string): Promise<boolean> {
  // Implement your admin check logic here
  // For now, return false (no admin privileges)
  // In a real implementation, you might check user roles or permissions
  return false
}

function convertToCSV(logs: any[]): string {
  if (logs.length === 0) return ""

  const headers = ["timestamp", "action", "entityType", "entityId", "userId", "userEmail", "metadata"]
  const rows = logs.map(log => [
    log.timestamp,
    log.action,
    log.entityType || "",
    log.entityId || "",
    log.userId || "",
    log.user?.email || "",
    JSON.stringify(log.metadata || {})
  ])

  return [
    headers.join(","),
    ...rows.map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(","))
  ].join("\n")
}