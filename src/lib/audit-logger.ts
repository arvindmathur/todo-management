import { prisma } from "./prisma"
import { DatabaseConnection } from "./db-connection"
import { NextRequest } from "next/server"

export interface AuditLogEntry {
  tenantId: string
  userId?: string
  action: string
  entityType?: string
  entityId?: string
  oldValues?: any
  newValues?: any
  metadata?: any
}

export interface RequestMetadata {
  ipAddress?: string
  userAgent?: string
  method?: string
  url?: string
  timestamp: Date
}

class AuditLogger {
  async log(entry: AuditLogEntry): Promise<void> {
    try {
      await DatabaseConnection.withRetry(
        () => prisma.auditLog.create({
          data: {
            tenantId: entry.tenantId,
            userId: entry.userId,
            action: entry.action,
            entityType: entry.entityType,
            entityId: entry.entityId,
            oldValues: entry.oldValues,
            newValues: entry.newValues,
            metadata: entry.metadata,
            timestamp: new Date()
          }
        }),
        'create-audit-log'
      )
    } catch (error) {
      console.error("Failed to write audit log:", error)
      // Don't throw - audit logging should not break the main operation
    }
  }

  async logUserAction(
    tenantId: string,
    userId: string,
    action: string,
    entityType?: string,
    entityId?: string,
    oldValues?: any,
    newValues?: any,
    request?: NextRequest
  ): Promise<void> {
    const metadata = request ? this.extractRequestMetadata(request) : undefined

    await this.log({
      tenantId,
      userId,
      action,
      entityType,
      entityId,
      oldValues,
      newValues,
      metadata
    })
  }

  async logSystemAction(
    tenantId: string,
    action: string,
    entityType?: string,
    entityId?: string,
    metadata?: any
  ): Promise<void> {
    await this.log({
      tenantId,
      action,
      entityType,
      entityId,
      metadata: {
        ...metadata,
        system: true,
        timestamp: new Date()
      }
    })
  }

  // Authentication events
  async logLogin(tenantId: string, userId: string, request?: NextRequest): Promise<void> {
    await this.logUserAction(tenantId, userId, "LOGIN", "user", userId, undefined, undefined, request)
  }

  async logLogout(tenantId: string, userId: string, request?: NextRequest): Promise<void> {
    await this.logUserAction(tenantId, userId, "LOGOUT", "user", userId, undefined, undefined, request)
  }

  async logFailedLogin(tenantId: string, email: string, request?: NextRequest): Promise<void> {
    const metadata = request ? this.extractRequestMetadata(request) : undefined
    await this.log({
      tenantId,
      action: "LOGIN_FAILED",
      entityType: "user",
      metadata: {
        ...metadata,
        email,
        reason: "Invalid credentials"
      }
    })
  }

  async logPasswordReset(tenantId: string, userId: string, request?: NextRequest): Promise<void> {
    await this.logUserAction(tenantId, userId, "PASSWORD_RESET", "user", userId, undefined, undefined, request)
  }

  // Entity CRUD events
  async logCreate(
    tenantId: string,
    userId: string,
    entityType: string,
    entityId: string,
    newValues: any,
    request?: NextRequest
  ): Promise<void> {
    await this.logUserAction(tenantId, userId, "CREATE", entityType, entityId, undefined, newValues, request)
  }

  async logUpdate(
    tenantId: string,
    userId: string,
    entityType: string,
    entityId: string,
    oldValues: any,
    newValues: any,
    request?: NextRequest
  ): Promise<void> {
    await this.logUserAction(tenantId, userId, "UPDATE", entityType, entityId, oldValues, newValues, request)
  }

  async logDelete(
    tenantId: string,
    userId: string,
    entityType: string,
    entityId: string,
    oldValues: any,
    request?: NextRequest
  ): Promise<void> {
    await this.logUserAction(tenantId, userId, "DELETE", entityType, entityId, oldValues, undefined, request)
  }

  // Bulk operations
  async logBulkDelete(
    tenantId: string,
    userId: string,
    entityType: string,
    count: number,
    criteria: any,
    request?: NextRequest
  ): Promise<void> {
    await this.logUserAction(
      tenantId,
      userId,
      "BULK_DELETE",
      entityType,
      undefined,
      undefined,
      { count, criteria },
      request
    )
  }

  // Security events
  async logSecurityEvent(
    tenantId: string,
    userId: string | undefined,
    event: string,
    details: any,
    request?: NextRequest
  ): Promise<void> {
    const metadata = request ? this.extractRequestMetadata(request) : undefined
    await this.log({
      tenantId,
      userId,
      action: `SECURITY_${event}`,
      metadata: {
        ...metadata,
        ...details,
        severity: "HIGH"
      }
    })
  }

  // Data access events
  async logDataAccess(
    tenantId: string,
    userId: string,
    entityType: string,
    operation: string,
    count?: number,
    request?: NextRequest
  ): Promise<void> {
    await this.logUserAction(
      tenantId,
      userId,
      `DATA_ACCESS_${operation}`,
      entityType,
      undefined,
      undefined,
      { count },
      request
    )
  }

  // Query audit logs
  async getAuditLogs(
    tenantId: string,
    filters: {
      userId?: string
      action?: string
      entityType?: string
      entityId?: string
      startDate?: Date
      endDate?: Date
      limit?: number
      offset?: number
    } = {}
  ) {
    const {
      userId,
      action,
      entityType,
      entityId,
      startDate,
      endDate,
      limit = 100,
      offset = 0
    } = filters

    const where: any = { tenantId }

    if (userId) where.userId = userId
    if (action) where.action = action
    if (entityType) where.entityType = entityType
    if (entityId) where.entityId = entityId
    if (startDate || endDate) {
      where.timestamp = {}
      if (startDate) where.timestamp.gte = startDate
      if (endDate) where.timestamp.lte = endDate
    }

    const [logs, totalCount] = await Promise.all([
      DatabaseConnection.withRetry(
        () => prisma.auditLog.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          },
          orderBy: { timestamp: "desc" },
          take: limit,
          skip: offset
        }),
        'get-audit-logs'
      ),
      DatabaseConnection.withRetry(
        () => prisma.auditLog.count({ where }),
        'count-audit-logs'
      )
    ])

    return {
      logs,
      totalCount,
      hasMore: offset + limit < totalCount
    }
  }

  // Analytics
  async getAuditStats(
    tenantId: string,
    startDate?: Date,
    endDate?: Date
  ) {
    const where: any = { tenantId }
    if (startDate || endDate) {
      where.timestamp = {}
      if (startDate) where.timestamp.gte = startDate
      if (endDate) where.timestamp.lte = endDate
    }

    const [
      totalLogs,
      actionStats,
      entityStats,
      userStats,
      securityEvents
    ] = await Promise.all([
      DatabaseConnection.withRetry(
        () => prisma.auditLog.count({ where }),
        'count-total-audit-logs'
      ),
      
      DatabaseConnection.withRetry(
        () => prisma.auditLog.groupBy({
          by: ["action"],
          where,
          _count: { action: true },
          orderBy: { _count: { action: "desc" } }
        }),
        'group-audit-logs-by-action'
      ),
      
      DatabaseConnection.withRetry(
        () => prisma.auditLog.groupBy({
          by: ["entityType"],
          where: { ...where, entityType: { not: null } },
          _count: { entityType: true },
          orderBy: { _count: { entityType: "desc" } }
        }),
        'group-audit-logs-by-entity'
      ),
      
      DatabaseConnection.withRetry(
        () => prisma.auditLog.groupBy({
          by: ["userId"],
          where: { ...where, userId: { not: null } },
          _count: { userId: true },
          orderBy: { _count: { userId: "desc" } }
        }),
        'group-audit-logs-by-user'
      ),
      
      DatabaseConnection.withRetry(
        () => prisma.auditLog.count({
          where: {
            ...where,
            action: { startsWith: "SECURITY_" }
          }
        }),
        'count-security-events'
      )
    ])

    return {
      totalLogs,
      actionStats,
      entityStats,
      userStats,
      securityEvents
    }
  }

  private extractRequestMetadata(request: NextRequest): RequestMetadata {
    return {
      ipAddress: this.getClientIP(request),
      userAgent: request.headers.get("user-agent") || undefined,
      method: request.method,
      url: request.url,
      timestamp: new Date()
    }
  }

  private getClientIP(request: NextRequest): string | undefined {
    // Try various headers for client IP
    const forwarded = request.headers.get("x-forwarded-for")
    if (forwarded) {
      return forwarded.split(",")[0].trim()
    }

    return (
      request.headers.get("x-real-ip") ||
      request.headers.get("x-client-ip") ||
      request.headers.get("cf-connecting-ip") ||
      undefined
    )
  }
}

export const auditLogger = new AuditLogger()

// Audit logging middleware for API routes
export function withAuditLogging<T extends any[]>(
  handler: (...args: T) => Promise<Response>,
  entityType?: string
) {
  return async (...args: T): Promise<Response> => {
    const request = args[0] as NextRequest
    const startTime = Date.now()
    
    try {
      const response = await handler(...args)
      
      // Log successful operations
      const duration = Date.now() - startTime
      console.log(`API ${request.method} ${request.url} - ${response.status} (${duration}ms)`)
      
      return response
    } catch (error) {
      // Log failed operations
      const duration = Date.now() - startTime
      console.error(`API ${request.method} ${request.url} - ERROR (${duration}ms):`, error)
      
      throw error
    }
  }
}