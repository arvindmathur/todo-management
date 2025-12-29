import { prisma } from "./prisma"
import { DatabaseConnection } from "./db-connection"

/**
 * Batch database operations for maximum performance with concurrent users
 */
export class BatchOperations {
  
  /**
   * Validate multiple entities in a single query to reduce database round trips
   */
  static async validateEntities(
    tenantId: string,
    userId: string,
    entities: {
      projectIds?: string[]
      contextIds?: string[]
      areaIds?: string[]
    }
  ): Promise<{
    validProjects: Set<string>
    validContexts: Set<string>
    validAreas: Set<string>
  }> {
    const queries = []
    
    if (entities.projectIds?.length) {
      queries.push(
        DatabaseConnection.withRetry(
          () => prisma.project.findMany({
            where: {
              id: { in: entities.projectIds },
              userId,
              tenantId,
            },
            select: { id: true }
          }),
          'validate-projects-batch'
        )
      )
    } else {
      queries.push(Promise.resolve([]))
    }
    
    if (entities.contextIds?.length) {
      queries.push(
        DatabaseConnection.withRetry(
          () => prisma.context.findMany({
            where: {
              id: { in: entities.contextIds },
              userId,
              tenantId,
            },
            select: { id: true }
          }),
          'validate-contexts-batch'
        )
      )
    } else {
      queries.push(Promise.resolve([]))
    }
    
    if (entities.areaIds?.length) {
      queries.push(
        DatabaseConnection.withRetry(
          () => prisma.area.findMany({
            where: {
              id: { in: entities.areaIds },
              userId,
              tenantId,
            },
            select: { id: true }
          }),
          'validate-areas-batch'
        )
      )
    } else {
      queries.push(Promise.resolve([]))
    }
    
    const [projects, contexts, areas] = await Promise.all(queries)
    
    return {
      validProjects: new Set(projects.map((p: any) => p.id)),
      validContexts: new Set(contexts.map((c: any) => c.id)),
      validAreas: new Set(areas.map((a: any) => a.id)),
    }
  }

  /**
   * Get comprehensive task statistics in a single optimized query
   */
  static async getTaskStatistics(
    tenantId: string,
    userId: string
  ): Promise<{
    counts: {
      all: number
      today: number
      overdue: number
      upcoming: number
      noDueDate: number
      focus: number
      completed: number
    }
    byPriority: Record<string, number>
    byProject: Array<{ projectId: string | null; count: number; projectName?: string }>
    byStatus: Record<string, number>
  }> {
    // Use a single raw SQL query for maximum performance
    const [countResults, priorityResults, projectResults, statusResults] = await Promise.all([
      // Task counts by date categories
      DatabaseConnection.withRetry(
        () => prisma.$queryRaw<Array<{
          count_type: string
          count_value: bigint
        }>>`
          SELECT 
            'all' as count_type, 
            COUNT(*) as count_value
          FROM "Task" 
          WHERE "tenantId" = ${tenantId} 
            AND "userId" = ${userId} 
            AND "status" = 'active'
          
          UNION ALL
          
          SELECT 
            'today' as count_type, 
            COUNT(*) as count_value
          FROM "Task" 
          WHERE "tenantId" = ${tenantId} 
            AND "userId" = ${userId} 
            AND "status" = 'active'
            AND "dueDate"::date = CURRENT_DATE
          
          UNION ALL
          
          SELECT 
            'overdue' as count_type, 
            COUNT(*) as count_value
          FROM "Task" 
          WHERE "tenantId" = ${tenantId} 
            AND "userId" = ${userId} 
            AND "status" = 'active'
            AND "dueDate"::date < CURRENT_DATE
          
          UNION ALL
          
          SELECT 
            'upcoming' as count_type, 
            COUNT(*) as count_value
          FROM "Task" 
          WHERE "tenantId" = ${tenantId} 
            AND "userId" = ${userId} 
            AND "status" = 'active'
            AND "dueDate"::date > CURRENT_DATE 
            AND "dueDate"::date <= CURRENT_DATE + INTERVAL '7 days'
          
          UNION ALL
          
          SELECT 
            'noDueDate' as count_type, 
            COUNT(*) as count_value
          FROM "Task" 
          WHERE "tenantId" = ${tenantId} 
            AND "userId" = ${userId} 
            AND "status" = 'active'
            AND "dueDate" IS NULL
          
          UNION ALL
          
          SELECT 
            'completed' as count_type, 
            COUNT(*) as count_value
          FROM "Task" 
          WHERE "tenantId" = ${tenantId} 
            AND "userId" = ${userId} 
            AND "status" = 'completed'
        `,
        'get-task-statistics-counts'
      ),
      
      // Task counts by priority
      DatabaseConnection.withRetry(
        () => prisma.task.groupBy({
          by: ['priority'],
          where: {
            tenantId,
            userId,
            status: 'active'
          },
          _count: { id: true }
        }),
        'get-task-statistics-priority'
      ),
      
      // Task counts by project
      DatabaseConnection.withRetry(
        () => prisma.task.groupBy({
          by: ['projectId'],
          where: {
            tenantId,
            userId,
            status: 'active'
          },
          _count: { id: true }
        }),
        'get-task-statistics-project'
      ),
      
      // Task counts by status
      DatabaseConnection.withRetry(
        () => prisma.task.groupBy({
          by: ['status'],
          where: {
            tenantId,
            userId,
          },
          _count: { id: true }
        }),
        'get-task-statistics-status'
      ),
    ])

    // Transform count results
    const counts = {
      all: 0,
      today: 0,
      overdue: 0,
      upcoming: 0,
      noDueDate: 0,
      focus: 0,
      completed: 0,
    }

    countResults.forEach(row => {
      const count = Number(row.count_value)
      switch (row.count_type) {
        case 'all':
          counts.all = count
          break
        case 'today':
          counts.today = count
          break
        case 'overdue':
          counts.overdue = count
          break
        case 'upcoming':
          counts.upcoming = count
          break
        case 'noDueDate':
          counts.noDueDate = count
          break
        case 'completed':
          counts.completed = count
          break
      }
    })

    // Calculate focus count (overdue + today)
    counts.focus = counts.overdue + counts.today

    // Transform other results
    const byPriority: Record<string, number> = {}
    priorityResults.forEach(row => {
      byPriority[row.priority] = row._count.id
    })

    const byProject = projectResults.map(row => ({
      projectId: row.projectId,
      count: row._count.id
    }))

    const byStatus: Record<string, number> = {}
    statusResults.forEach(row => {
      byStatus[row.status] = row._count.id
    })

    return {
      counts,
      byPriority,
      byProject,
      byStatus
    }
  }

  /**
   * Batch create multiple tasks efficiently
   */
  static async createTasks(
    tenantId: string,
    userId: string,
    tasks: Array<{
      title: string
      description?: string
      priority: string
      dueDate?: Date
      projectId?: string
      contextId?: string
      areaId?: string
      tags?: string[]
    }>
  ) {
    return DatabaseConnection.withRetry(
      () => prisma.task.createMany({
        data: tasks.map(task => ({
          ...task,
          userId,
          tenantId,
          tags: task.tags || [],
        }))
      }),
      'batch-create-tasks'
    )
  }

  /**
   * Batch update multiple tasks efficiently
   */
  static async updateTasks(
    tenantId: string,
    userId: string,
    updates: Array<{
      id: string
      data: Record<string, any>
    }>
  ) {
    // Use transaction for consistency
    return DatabaseConnection.withRetry(
      () => prisma.$transaction(
        updates.map(update => 
          prisma.task.update({
            where: { 
              id: update.id,
              userId,
              tenantId
            },
            data: update.data
          })
        )
      ),
      'batch-update-tasks'
    )
  }

  /**
   * Get user's most frequently used entities for autocomplete/suggestions
   */
  static async getUserFrequentEntities(
    tenantId: string,
    userId: string
  ): Promise<{
    projects: Array<{ id: string; name: string; taskCount: number }>
    contexts: Array<{ id: string; name: string; taskCount: number }>
    areas: Array<{ id: string; name: string; taskCount: number }>
    tags: Array<{ tag: string; count: number }>
  }> {
    const [projects, contexts, areas, tagResults] = await Promise.all([
      // Most used projects
      DatabaseConnection.withRetry(
        () => prisma.$queryRaw<Array<{
          id: string
          name: string
          task_count: bigint
        }>>`
          SELECT p.id, p.name, COUNT(t.id) as task_count
          FROM "Project" p
          LEFT JOIN "Task" t ON p.id = t."projectId" AND t."userId" = ${userId} AND t."tenantId" = ${tenantId}
          WHERE p."userId" = ${userId} AND p."tenantId" = ${tenantId}
          GROUP BY p.id, p.name
          ORDER BY task_count DESC, p.name ASC
          LIMIT 10
        `,
        'get-frequent-projects'
      ),
      
      // Most used contexts
      DatabaseConnection.withRetry(
        () => prisma.$queryRaw<Array<{
          id: string
          name: string
          task_count: bigint
        }>>`
          SELECT c.id, c.name, COUNT(t.id) as task_count
          FROM "Context" c
          LEFT JOIN "Task" t ON c.id = t."contextId" AND t."userId" = ${userId} AND t."tenantId" = ${tenantId}
          WHERE c."userId" = ${userId} AND c."tenantId" = ${tenantId}
          GROUP BY c.id, c.name
          ORDER BY task_count DESC, c.name ASC
          LIMIT 10
        `,
        'get-frequent-contexts'
      ),
      
      // Most used areas
      DatabaseConnection.withRetry(
        () => prisma.$queryRaw<Array<{
          id: string
          name: string
          task_count: bigint
        }>>`
          SELECT a.id, a.name, COUNT(t.id) as task_count
          FROM "Area" a
          LEFT JOIN "Task" t ON a.id = t."areaId" AND t."userId" = ${userId} AND t."tenantId" = ${tenantId}
          WHERE a."userId" = ${userId} AND a."tenantId" = ${tenantId}
          GROUP BY a.id, a.name
          ORDER BY task_count DESC, a.name ASC
          LIMIT 10
        `,
        'get-frequent-areas'
      ),
      
      // Most used tags
      DatabaseConnection.withRetry(
        () => prisma.$queryRaw<Array<{
          tag: string
          count: bigint
        }>>`
          SELECT unnest(tags) as tag, COUNT(*) as count
          FROM "Task"
          WHERE "userId" = ${userId} AND "tenantId" = ${tenantId}
          GROUP BY tag
          ORDER BY count DESC
          LIMIT 20
        `,
        'get-frequent-tags'
      ),
    ])

    return {
      projects: projects.map(p => ({
        id: p.id,
        name: p.name,
        taskCount: Number(p.task_count)
      })),
      contexts: contexts.map(c => ({
        id: c.id,
        name: c.name,
        taskCount: Number(c.task_count)
      })),
      areas: areas.map(a => ({
        id: a.id,
        name: a.name,
        taskCount: Number(a.task_count)
      })),
      tags: tagResults.map(t => ({
        tag: t.tag,
        count: Number(t.count)
      }))
    }
  }
}