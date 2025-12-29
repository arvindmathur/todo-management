import { prisma } from "./prisma"
import { cache } from "./cache"
import { withDatabaseRetry } from "./db-connection"

// Optimized database queries with caching
export class OptimizedDbService {
  // Get user preferences with caching
  static async getUserPreferences(userId: string) {
    return cache.getUserPreferences(userId, async () => {
      return withDatabaseRetry(
        () => prisma.user.findUnique({
          where: { id: userId },
          select: {
            preferences: true,
            gtdEnabled: true,
          },
        }),
        'getUserPreferences'
      )
    })
  }

  // Get task counts with caching and optimized queries
  static async getTaskCounts(tenantId: string, userId: string) {
    const cacheKey = `counts:${tenantId}:${userId}`
    
    return cache.getOrSet(cacheKey, async () => {
      // Use a single query with conditional aggregation for better performance
      const result = await withDatabaseRetry(
        () => prisma.task.groupBy({
          by: ["status"],
          where: {
            tenantId,
            userId,
          },
          _count: {
            id: true,
          },
        }),
        'getTaskCounts-groupBy'
      )

      // Transform to expected format
      const counts = {
        active: 0,
        completed: 0,
        archived: 0,
        overdue: 0,
        today: 0,
        upcoming: 0,
      }

      result.forEach((group) => {
        counts[group.status as keyof typeof counts] = group._count.id
      })

      // Get date-based counts in a separate optimized query
      const now = new Date()
      // Use UTC dates to avoid timezone issues
      const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
      const tomorrowUTC = new Date(todayUTC)
      tomorrowUTC.setUTCDate(tomorrowUTC.getUTCDate() + 1)

      const [overdue, todayTasks, upcoming] = await Promise.all([
        withDatabaseRetry(
          () => prisma.task.count({
            where: {
              tenantId,
              userId,
              status: "active",
              dueDate: { lt: todayUTC },
            },
          }),
          'getTaskCounts-overdue'
        ),
        withDatabaseRetry(
          () => prisma.task.count({
            where: {
              tenantId,
              userId,
              status: "active",
              dueDate: { gte: todayUTC, lt: tomorrowUTC },
            },
          }),
          'getTaskCounts-today'
        ),
        withDatabaseRetry(
          () => prisma.task.count({
            where: {
              tenantId,
              userId,
              status: "active",
              dueDate: { 
                gte: tomorrowUTC,
                lt: new Date(tomorrowUTC.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days from tomorrow
              },
            },
          }),
          'getTaskCounts-upcoming'
        ),
      ])

      counts.overdue = overdue
      counts.today = todayTasks
      counts.upcoming = upcoming

      return counts
    }, 60) // Cache for 1 minute
  }

  // Get project statistics with caching
  static async getProjectStats(tenantId: string, userId: string) {
    return cache.getProjectStats(tenantId, userId, async () => {
      // Optimized query using aggregation
      const [projectCounts, taskCounts] = await Promise.all([
        withDatabaseRetry(
          () => prisma.project.groupBy({
            by: ["status"],
            where: { tenantId, userId },
            _count: { id: true },
          }),
          'getProjectStats-projectCounts'
        ),
        withDatabaseRetry(
          () => prisma.task.groupBy({
            by: ["projectId"],
            where: {
              tenantId,
              userId,
              projectId: { not: null },
            },
            _count: { id: true },
          }),
          'getProjectStats-taskCounts'
        ),
      ])

      const stats = {
        totalProjects: projectCounts.reduce((sum, group) => sum + group._count.id, 0),
        activeProjects: projectCounts.find(g => g.status === "active")?._count.id || 0,
        completedProjects: projectCounts.find(g => g.status === "completed")?._count.id || 0,
        averageTasksPerProject: taskCounts.length > 0 
          ? Math.round(taskCounts.reduce((sum, group) => sum + group._count.id, 0) / taskCounts.length)
          : 0,
      }

      return stats
    })
  }

  // Get contexts with caching and optimized query
  static async getContexts(tenantId: string, userId: string) {
    return cache.getContextList(tenantId, userId, async () => {
      return withDatabaseRetry(
        () => prisma.context.findMany({
          where: { tenantId, userId },
          select: {
            id: true,
            name: true,
            description: true,
            icon: true,
            isDefault: true,
            _count: {
              select: {
                tasks: {
                  where: { status: "active" },
                },
              },
            },
          },
          orderBy: [
            { isDefault: "desc" },
            { name: "asc" },
          ],
        }),
        'getContexts'
      )
    })
  }

  // Get areas with caching and optimized query
  static async getAreas(tenantId: string, userId: string) {
    return cache.getAreaList(tenantId, userId, async () => {
      return withDatabaseRetry(
        () => prisma.area.findMany({
          where: { tenantId, userId },
          select: {
            id: true,
            name: true,
            description: true,
            color: true,
            _count: {
              select: {
                tasks: {
                  where: { status: "active" },
                },
                projects: {
                  where: { status: "active" },
                },
              },
            },
          },
          orderBy: { name: "asc" },
        }),
        'getAreas'
      )
    })
  }

  // Get inbox count with caching
  static async getInboxCount(tenantId: string, userId: string) {
    return cache.getInboxCount(tenantId, userId, async () => {
      return withDatabaseRetry(
        () => prisma.inboxItem.count({
          where: {
            tenantId,
            userId,
            processed: false,
          },
        }),
        'getInboxCount'
      )
    })
  }

  // Get tasks with optimized query and pagination
  static async getTasks(
    tenantId: string,
    userId: string,
    filters: {
      status?: string
      priority?: string
      projectId?: string
      contextId?: string
      areaId?: string
      dueDate?: string
      search?: string
      limit?: number
      offset?: number
      includeCompleted?: string
    } = {}
  ) {
    const {
      status = "active",
      priority,
      projectId,
      contextId,
      areaId,
      dueDate,
      search,
      limit = 50,
      offset = 0,
      includeCompleted = "none",
    } = filters

    // Build optimized where clause
    const where: any = {
      tenantId,
      userId,
    }

    // Handle status and completed task filtering
    if (status === "all" || includeCompleted !== "none") {
      const statusConditions = []
      
      // Always include active tasks unless specifically filtering for completed only
      if (status !== "completed") {
        statusConditions.push({ status: "active" })
      }
      
      // Include completed tasks based on the filter
      if (status === "completed" || includeCompleted !== "none") {
        const completedCondition: any = { status: "completed" }
        
        if (includeCompleted !== "none") {
          const now = new Date()
          let completedAfter: Date
          
          switch (includeCompleted) {
            case "1day":
              completedAfter = new Date(now.getTime() - 24 * 60 * 60 * 1000)
              break
            case "7days":
              completedAfter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
              break
            case "30days":
              completedAfter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
              break
            default:
              completedAfter = new Date(0) // Include all completed tasks
          }
          
          completedCondition.completedAt = { gte: completedAfter }
        }
        
        statusConditions.push(completedCondition)
      }
      
      if (statusConditions.length > 1) {
        where.OR = statusConditions
      } else if (statusConditions.length === 1) {
        // If only one condition, apply it directly
        Object.assign(where, statusConditions[0])
      }
    } else {
      where.status = status
    }

    if (priority) where.priority = priority
    if (projectId) where.projectId = projectId
    if (contextId) where.contextId = contextId
    if (areaId) where.areaId = areaId

    // Handle search filter
    const searchConditions = []
    if (search) {
      searchConditions.push(
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } }
      )
    }

    // Handle date filters
    const dateConditions = []
    if (dueDate) {
      const now = new Date()
      // Use local timezone for date comparisons to match user expectations
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      switch (dueDate) {
        case "today":
          where.dueDate = { gte: today, lt: tomorrow }
          break
        case "overdue":
          where.dueDate = { lt: today }
          break
        case "upcoming":
          // Next 7 days after tomorrow
          const futureDate = new Date(tomorrow)
          futureDate.setDate(futureDate.getDate() + 7)
          where.dueDate = { gte: tomorrow, lt: futureDate }
          break
        case "no-due-date":
          where.dueDate = null
          break
        case "focus":
          // Focus view: overdue OR today (excludes upcoming and no-due-date)
          dateConditions.push(
            { dueDate: { lt: today } }, // Overdue
            { dueDate: { gte: today, lt: tomorrow } } // Today
          )
          break
      }
    }

    // Combine OR conditions if needed
    const orConditions = []
    
    // Add search conditions
    if (searchConditions.length > 0) {
      orConditions.push(...searchConditions)
    }
    
    // Add date conditions
    if (dateConditions.length > 0) {
      orConditions.push(...dateConditions)
    }
    
    // If we have OR conditions from search/date AND status OR conditions, we need to use AND
    if (orConditions.length > 0 && where.OR) {
      // Move status OR to AND clause
      where.AND = [
        { OR: where.OR }, // Status conditions
        { OR: orConditions } // Search/date conditions
      ]
      delete where.OR
    } else if (orConditions.length > 0) {
      where.OR = orConditions
    }

    // Use optimized query with selective includes
    const [tasks, totalCount] = await Promise.all([
      withDatabaseRetry(
        () => prisma.task.findMany({
          where,
          select: {
            id: true,
            title: true,
            description: true,
            status: true,
            priority: true,
            dueDate: true,
            completedAt: true,
            tags: true,
            createdAt: true,
            updatedAt: true,
            project: {
              select: { id: true, name: true },
            },
            context: {
              select: { id: true, name: true, icon: true },
            },
            area: {
              select: { id: true, name: true, color: true },
            },
          },
          orderBy: [
            { priority: "desc" },
            { dueDate: "asc" },
            { createdAt: "desc" },
          ],
          take: limit,
          skip: offset,
        }),
        'getTasks-findMany'
      ),
      withDatabaseRetry(
        () => prisma.task.count({ where }),
        'getTasks-count'
      ),
    ])

    return {
      tasks,
      totalCount,
      hasMore: offset + limit < totalCount,
    }
  }

  // Get projects with optimized query
  static async getProjects(
    tenantId: string,
    userId: string,
    filters: {
      status?: string
      areaId?: string
      limit?: number
      offset?: number
    } = {}
  ) {
    const {
      status = "active",
      areaId,
      limit = 50,
      offset = 0,
    } = filters

    const where: any = {
      tenantId,
      userId,
      status,
    }

    if (areaId) where.areaId = areaId

    const [projects, totalCount] = await Promise.all([
      withDatabaseRetry(
        () => prisma.project.findMany({
          where,
          select: {
            id: true,
            name: true,
            description: true,
            status: true,
            outcome: true,
            createdAt: true,
            updatedAt: true,
            area: {
              select: { id: true, name: true, color: true },
            },
            _count: {
              select: {
                tasks: {
                  where: { status: "active" },
                },
              },
            },
          },
          orderBy: [
            { status: "asc" },
            { updatedAt: "desc" },
          ],
          take: limit,
          skip: offset,
        }),
        'getProjects-findMany'
      ),
      withDatabaseRetry(
        () => prisma.project.count({ where }),
        'getProjects-count'
      ),
    ])

    return {
      projects,
      totalCount,
      hasMore: offset + limit < totalCount,
    }
  }

  // Invalidate caches when data changes
  static async invalidateUserCaches(tenantId: string, userId: string) {
    await cache.invalidateUserCache(tenantId, userId)
  }

  static async invalidateTenantCaches(tenantId: string) {
    await cache.invalidateTenantCache(tenantId)
  }

  // Batch operations for better performance
  static async batchUpdateTasks(
    tenantId: string,
    userId: string,
    taskIds: string[],
    updates: any
  ) {
    // Validate all tasks belong to user first
    const taskCount = await withDatabaseRetry(
      () => prisma.task.count({
        where: {
          id: { in: taskIds },
          tenantId,
          userId,
        },
      }),
      'batchUpdateTasks-validate'
    )

    if (taskCount !== taskIds.length) {
      throw new Error("Some tasks not found or unauthorized")
    }

    // Perform batch update
    const result = await withDatabaseRetry(
      () => prisma.task.updateMany({
        where: {
          id: { in: taskIds },
          tenantId,
          userId,
        },
        data: updates,
      }),
      'batchUpdateTasks-update'
    )

    // Invalidate caches
    await this.invalidateUserCaches(tenantId, userId)

    return result
  }

  // Batch delete for better performance
  static async batchDeleteTasks(
    tenantId: string,
    userId: string,
    taskIds: string[]
  ) {
    // Validate all tasks belong to user first
    const taskCount = await withDatabaseRetry(
      () => prisma.task.count({
        where: {
          id: { in: taskIds },
          tenantId,
          userId,
        },
      }),
      'batchDeleteTasks-validate'
    )

    if (taskCount !== taskIds.length) {
      throw new Error("Some tasks not found or unauthorized")
    }

    // Perform batch delete
    const result = await withDatabaseRetry(
      () => prisma.task.deleteMany({
        where: {
          id: { in: taskIds },
          tenantId,
          userId,
        },
      }),
      'batchDeleteTasks-delete'
    )

    // Invalidate caches
    await this.invalidateUserCaches(tenantId, userId)

    return result
  }
}