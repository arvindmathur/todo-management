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
      // Import the new task filter service for timezone-aware counts
      const { TaskFilterService } = await import('./task-filter-service')
      
      try {
        // Use the new timezone-aware filter service
        const counts = await TaskFilterService.getFilterCounts(tenantId, userId)
        
        // Convert to the expected format for backward compatibility
        return {
          active: counts.all - (counts.all - counts.focus - counts.upcoming - counts.noDueDate), // Approximate active count
          completed: 0, // Will be included in other counts based on user preference
          archived: 0,
          overdue: counts.overdue,
          today: counts.today,
          upcoming: counts.upcoming,
          focus: counts.focus,
          noDueDate: counts.noDueDate,
          all: counts.all
        }
      } catch (error) {
        console.error('Error getting timezone-aware task counts:', error)
        
        // Fallback to original logic if new service fails
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
          'getTaskCounts-groupBy-fallback'
        )

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

        return counts
      }
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

  // Get tasks with optimized query and pagination (timezone-aware)
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
    try {
      // Import the new task filter service for timezone-aware filtering
      const { TaskFilterService } = await import('./task-filter-service')
      
      // Use the new timezone-aware filter service
      return await TaskFilterService.getFilteredTasks(tenantId, userId, filters)
    } catch (error) {
      console.error('Error in timezone-aware getTasks, falling back to original logic:', error)
      
      // Fallback to original logic if new service fails
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

      // Build simplified where clause to avoid complex OR/AND issues
      const where: any = {
        tenantId,
        userId,
      }

      // Simplified status handling
      if (status === "all") {
        // Don't add status filter - get all tasks
      } else if (status === "completed") {
        where.status = "completed"
      } else {
        where.status = "active"
      }

      // Add simple filters
      if (priority) where.priority = priority
      if (projectId) where.projectId = projectId
      if (contextId) where.contextId = contextId
      if (areaId) where.areaId = areaId

      // Simplified search - only search in title for now
      if (search) {
        where.title = { contains: search, mode: "insensitive" }
      }

      // Simplified date filters (using server timezone as fallback)
      if (dueDate) {
        const now = new Date()
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
            const futureDate = new Date(tomorrow)
            futureDate.setDate(futureDate.getDate() + 7)
            where.dueDate = { gte: tomorrow, lt: futureDate }
            break
          case "no-due-date":
            where.dueDate = null
            break
          case "focus":
            // For focus, just get overdue tasks for now
            where.dueDate = { lt: today }
            break
        }
      }

      // Use simplified query with basic error handling
      try {
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
            'getTasks-findMany-fallback'
          ),
          withDatabaseRetry(
            () => prisma.task.count({ where }),
            'getTasks-count-fallback'
          ),
        ])

        return {
          tasks,
          totalCount,
          hasMore: offset + limit < totalCount,
        }
      } catch (error) {
        console.error('Error in fallback getTasks:', error)
        // Return empty result on error to prevent app crash
        return {
          tasks: [],
          totalCount: 0,
          hasMore: false,
        }
      }
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