import { DatabaseConnection } from "./db-connection"
import { TimezoneService } from "./timezone-service"
import { prisma } from "./prisma"

export interface TaskFilters {
  status?: string
  priority?: string
  projectId?: string
  contextId?: string
  areaId?: string
  dueDate?: "today" | "overdue" | "upcoming" | "no-due-date" | "focus"
  search?: string
  limit?: number
  offset?: number
  includeCompleted?: string
}

export interface FilterCounts {
  all: number
  focus: number
  today: number
  overdue: number
  upcoming: number
  noDueDate: number
}

export interface TaskResult {
  tasks: any[]
  totalCount: number
  hasMore: boolean
}

export class TaskFilterService {
  /**
   * Get tasks with timezone-aware filtering
   */
  static async getFilteredTasks(
    tenantId: string,
    userId: string,
    filters: TaskFilters
  ): Promise<TaskResult> {
    // Input validation
    if (!tenantId || !userId) {
      console.error('Invalid parameters for getFilteredTasks:', { tenantId, userId })
      return {
        tasks: [],
        totalCount: 0,
        hasMore: false,
      }
    }

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

    // Validate limit and offset
    const validLimit = Math.max(1, Math.min(limit, 1000)) // Cap at 1000 for performance
    const validOffset = Math.max(0, offset)

    try {
      // Get user timezone and completed task window with error handling
      const [userTimezone, completedTaskWindow] = await Promise.all([
        TimezoneService.getUserTimezone(userId).catch(error => {
          console.warn('Failed to get user timezone, using UTC:', error)
          return 'UTC'
        }),
        TimezoneService.getCompletedTaskWindow(userId).catch(error => {
          console.warn('Failed to get completed task window, using default:', error)
          return 7
        })
      ])

      // Get date boundaries for filtering with error handling
      let boundaries
      try {
        boundaries = await TimezoneService.getDateBoundaries(userId, completedTaskWindow)
      } catch (error) {
        console.error('Failed to get date boundaries, using fallback:', error)
        // Fallback boundaries using current time
        const now = new Date()
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)
        boundaries = {
          todayStart,
          todayEnd,
          tomorrowStart: todayEnd,
          weekFromNow: new Date(todayStart.getTime() + 7 * 24 * 60 * 60 * 1000),
          completedTaskCutoff: new Date(todayStart.getTime() - completedTaskWindow * 24 * 60 * 60 * 1000)
        }
      }

      // Build the base filters first (non-status filters)
      const baseFilters: any = {
        tenantId,
        userId,
      }

      // Add simple filters with validation
      if (priority && ['low', 'medium', 'high', 'urgent'].includes(priority)) {
        baseFilters.priority = priority
      }
      if (projectId && typeof projectId === 'string') {
        baseFilters.projectId = projectId
      }
      if (contextId && typeof contextId === 'string') {
        baseFilters.contextId = contextId
      }
      if (areaId && typeof areaId === 'string') {
        baseFilters.areaId = areaId
      }

      // Add search filter with validation
      if (search && typeof search === 'string' && search.trim().length > 0) {
        baseFilters.title = { contains: search.trim(), mode: "insensitive" }
      }

      // Handle date-based filtering with timezone awareness and status filtering combined
      let where: any
      if (dueDate) {
        try {
          const dateFilter = this.buildDateFilter(dueDate, boundaries, includeCompleted)
          if (dateFilter) {
            // Combine base filters with date filter
            // When date filter has OR conditions, we need to ensure base filters apply to all branches
            if (dateFilter.OR) {
              // Apply base filters to each OR branch
              where = {
                ...baseFilters,
                OR: dateFilter.OR.map((condition: any) => ({
                  ...condition
                }))
              }
            } else {
              // Simple date filter, merge directly
              where = {
                ...baseFilters,
                ...dateFilter
              }
            }
          } else {
            // No date filter, just apply status filtering
            where = this.applyStatusFilter(baseFilters, status, includeCompleted, boundaries)
          }
        } catch (dateFilterError) {
          console.error('Error building date filter:', dateFilterError)
          // Fall back to status filtering only
          where = this.applyStatusFilter(baseFilters, status, includeCompleted, boundaries)
        }
      } else {
        // No date filter, just apply status filtering
        where = this.applyStatusFilter(baseFilters, status, includeCompleted, boundaries)
      }

      // Execute database queries with enhanced error handling
      const [tasks, totalCount] = await Promise.all([
        DatabaseConnection.withRetry(
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
            orderBy: this.buildSortOrder(includeCompleted),
            take: validLimit,
            skip: validOffset,
          }),
          'getFilteredTasks-findMany'
        ).catch(error => {
          console.error('Database query failed for tasks:', error)
          return [] // Return empty array on database error
        }),
        DatabaseConnection.withRetry(
          () => prisma.task.count({ where }),
          'getFilteredTasks-count'
        ).catch(error => {
          console.error('Database query failed for count:', error)
          return 0 // Return 0 count on database error
        }),
      ])

      return {
        tasks: tasks || [],
        totalCount: totalCount || 0,
        hasMore: (validOffset + validLimit) < (totalCount || 0),
      }
    } catch (error) {
      console.error('Error in getFilteredTasks:', error)
      console.error('Filter parameters:', { tenantId, userId, filters })
      
      // Return empty result rather than throwing
      return {
        tasks: [],
        totalCount: 0,
        hasMore: false,
      }
    }
  }

  /**
   * Get filter counts with timezone awareness
   */
  static async getFilterCounts(
    tenantId: string,
    userId: string
  ): Promise<FilterCounts> {
    try {
      // Get user timezone and completed task window
      const [userTimezone, completedTaskWindow] = await Promise.all([
        TimezoneService.getUserTimezone(userId),
        TimezoneService.getCompletedTaskWindow(userId)
      ])

      // Get date boundaries for filtering
      const boundaries = await TimezoneService.getDateBoundaries(userId, completedTaskWindow)

      // Build queries for each filter type
      const [
        allCount,
        todayCount,
        overdueCount,
        upcomingCount,
        noDueDateCount,
        completedTodayCount,
        completedOverdueCount,
        completedUpcomingCount
      ] = await Promise.all([
        // All tasks (active + completed within window)
        DatabaseConnection.withRetry(
          () => prisma.task.count({
            where: {
              tenantId,
              userId,
              OR: [
                { status: "active" },
                { 
                  status: "completed",
                  completedAt: { gte: boundaries.completedTaskCutoff }
                }
              ]
            }
          }),
          'getFilterCounts-all'
        ),

        // Today tasks (active)
        DatabaseConnection.withRetry(
          () => prisma.task.count({
            where: {
              tenantId,
              userId,
              status: "active",
              dueDate: { 
                gte: boundaries.todayStart,
                lt: boundaries.todayEnd
              }
            }
          }),
          'getFilterCounts-today'
        ),

        // Overdue tasks (active)
        DatabaseConnection.withRetry(
          () => prisma.task.count({
            where: {
              tenantId,
              userId,
              status: "active",
              dueDate: { lt: boundaries.todayStart }
            }
          }),
          'getFilterCounts-overdue'
        ),

        // Upcoming tasks (active)
        DatabaseConnection.withRetry(
          () => prisma.task.count({
            where: {
              tenantId,
              userId,
              status: "active",
              dueDate: { 
                gte: boundaries.tomorrowStart,
                lt: boundaries.weekFromNow
              }
            }
          }),
          'getFilterCounts-upcoming'
        ),

        // No due date tasks (active)
        DatabaseConnection.withRetry(
          () => prisma.task.count({
            where: {
              tenantId,
              userId,
              status: "active",
              dueDate: null
            }
          }),
          'getFilterCounts-noDueDate'
        ),

        // Completed today tasks
        DatabaseConnection.withRetry(
          () => prisma.task.count({
            where: {
              tenantId,
              userId,
              status: "completed",
              completedAt: { gte: boundaries.completedTaskCutoff },
              OR: [
                { dueDate: { gte: boundaries.todayStart, lt: boundaries.todayEnd } },
                { completedAt: { gte: boundaries.todayStart, lt: boundaries.todayEnd } }
              ]
            }
          }),
          'getFilterCounts-completedToday'
        ),

        // Completed overdue tasks
        DatabaseConnection.withRetry(
          () => prisma.task.count({
            where: {
              tenantId,
              userId,
              status: "completed",
              completedAt: { gte: boundaries.completedTaskCutoff },
              dueDate: { lt: boundaries.todayStart }
            }
          }),
          'getFilterCounts-completedOverdue'
        ),

        // Completed upcoming tasks
        DatabaseConnection.withRetry(
          () => prisma.task.count({
            where: {
              tenantId,
              userId,
              status: "completed",
              completedAt: { gte: boundaries.completedTaskCutoff },
              dueDate: { gte: boundaries.tomorrowStart, lt: boundaries.weekFromNow }
            }
          }),
          'getFilterCounts-completedUpcoming'
        )
      ])

      // Calculate final counts including completed tasks
      const todayTotal = todayCount + completedTodayCount
      const overdueTotal = overdueCount + completedOverdueCount
      const upcomingTotal = upcomingCount + completedUpcomingCount
      const focusTotal = todayTotal + overdueTotal

      return {
        all: allCount,
        focus: focusTotal,
        today: todayTotal,
        overdue: overdueTotal,
        upcoming: upcomingTotal,
        noDueDate: noDueDateCount
      }
    } catch (error) {
      console.error('Error getting filter counts:', error)
      return {
        all: 0,
        focus: 0,
        today: 0,
        overdue: 0,
        upcoming: 0,
        noDueDate: 0
      }
    }
  }

  /**
   * Apply status filtering to base filters
   */
  private static applyStatusFilter(
    baseFilters: any,
    status: string,
    includeCompleted: string,
    boundaries: any
  ): any {
    if (status === "all") {
      // Include completed tasks based on user preference
      if (includeCompleted !== "none") {
        return {
          ...baseFilters,
          OR: [
            { status: "active" },
            { 
              status: "completed",
              completedAt: { gte: boundaries.completedTaskCutoff }
            }
          ]
        }
      } else {
        return {
          ...baseFilters,
          status: "active"
        }
      }
    } else if (status === "completed") {
      const completedFilter: any = {
        ...baseFilters,
        status: "completed"
      }
      if (includeCompleted !== "none") {
        completedFilter.completedAt = { gte: boundaries.completedTaskCutoff }
      }
      return completedFilter
    } else {
      return {
        ...baseFilters,
        status: "active"
      }
    }
  }

  /**
   * Build date filter conditions based on filter type and boundaries
   */
  private static buildDateFilter(
    dueDate: string,
    boundaries: any,
    includeCompleted: string
  ): any {
    const includeCompletedTasks = includeCompleted !== "none"

    switch (dueDate) {
      case "today":
        if (includeCompletedTasks) {
          return {
            OR: [
              // Active tasks due today
              {
                status: "active",
                dueDate: { gte: boundaries.todayStart, lt: boundaries.todayEnd }
              },
              // Completed tasks due today or completed today
              {
                status: "completed",
                completedAt: { gte: boundaries.completedTaskCutoff },
                OR: [
                  { dueDate: { gte: boundaries.todayStart, lt: boundaries.todayEnd } },
                  { completedAt: { gte: boundaries.todayStart, lt: boundaries.todayEnd } }
                ]
              }
            ]
          }
        } else {
          return {
            status: "active",
            dueDate: { gte: boundaries.todayStart, lt: boundaries.todayEnd }
          }
        }

      case "overdue":
        if (includeCompletedTasks) {
          return {
            OR: [
              // Active overdue tasks
              {
                status: "active",
                dueDate: { lt: boundaries.todayStart }
              },
              // Completed overdue tasks
              {
                status: "completed",
                completedAt: { gte: boundaries.completedTaskCutoff },
                dueDate: { lt: boundaries.todayStart }
              }
            ]
          }
        } else {
          return {
            status: "active",
            dueDate: { lt: boundaries.todayStart }
          }
        }

      case "upcoming":
        if (includeCompletedTasks) {
          return {
            OR: [
              // Active upcoming tasks
              {
                status: "active",
                dueDate: { gte: boundaries.tomorrowStart, lt: boundaries.weekFromNow }
              },
              // Completed upcoming tasks
              {
                status: "completed",
                completedAt: { gte: boundaries.completedTaskCutoff },
                dueDate: { gte: boundaries.tomorrowStart, lt: boundaries.weekFromNow }
              }
            ]
          }
        } else {
          return {
            status: "active",
            dueDate: { gte: boundaries.tomorrowStart, lt: boundaries.weekFromNow }
          }
        }

      case "no-due-date":
        if (includeCompletedTasks) {
          return {
            OR: [
              // Active tasks with no due date
              {
                status: "active",
                dueDate: null
              },
              // Completed tasks with no due date
              {
                status: "completed",
                completedAt: { gte: boundaries.completedTaskCutoff },
                dueDate: null
              }
            ]
          }
        } else {
          return {
            status: "active",
            dueDate: null
          }
        }

      case "focus":
        if (includeCompletedTasks) {
          return {
            OR: [
              // Active today and overdue tasks
              {
                status: "active",
                dueDate: { lt: boundaries.todayEnd }
              },
              // Completed tasks (today or overdue)
              {
                status: "completed",
                completedAt: { gte: boundaries.completedTaskCutoff },
                OR: [
                  { dueDate: { lt: boundaries.todayEnd } },
                  { completedAt: { gte: boundaries.todayStart, lt: boundaries.todayEnd } }
                ]
              }
            ]
          }
        } else {
          return {
            status: "active",
            dueDate: { lt: boundaries.todayEnd }
          }
        }

      default:
        return null
    }
  }

  /**
   * Build sort order with completed tasks at the end
   */
  private static buildSortOrder(includeCompleted: string): any[] {
    const baseOrder = [
      { status: "asc" }, // Active tasks first, completed tasks last
      { priority: "desc" },
      { dueDate: "asc" },
      { createdAt: "desc" }
    ]

    return baseOrder
  }

  /**
   * Refresh filters for timezone changes (for real-time updates)
   */
  static async refreshFiltersForTimezone(userTimezone: string): Promise<void> {
    // This would be called when midnight occurs in a timezone
    // For now, we'll just clear the timezone cache to force refresh
    TimezoneService.clearAllCache()
  }
}