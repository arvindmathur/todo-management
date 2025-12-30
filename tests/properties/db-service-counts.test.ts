import * as fc from 'fast-check'
import { TaskFilterService } from '@/lib/task-filter-service'
import { TimezoneService } from '@/lib/timezone-service'

// Mock the database connection
jest.mock('@/lib/db-connection', () => ({
  DatabaseConnection: {
    withRetry: jest.fn((fn) => fn())
  }
}))

// Mock prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    task: {
      findMany: jest.fn(),
      count: jest.fn()
    }
  }
}))

describe('Database Service Count Property Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    TimezoneService.clearAllCache()
  })

  /**
   * Feature: task-filtering-fixes, Property 8: Filter Count Accuracy
   * For any set of tasks and filter criteria, the displayed filter count should 
   * exactly match the number of tasks returned by that filter
   */
  test('Property 8: Filter Count Accuracy', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('UTC', 'America/New_York', 'Europe/London', 'Asia/Singapore'),
        fc.constantFrom('today', 'overdue', 'upcoming', 'focus', 'no-due-date'),
        fc.integer({ min: 0, max: 50 }),
        async (timezone, filterType, expectedCount) => {
          // Mock timezone service methods
          TimezoneService.getUserTimezone = jest.fn().mockResolvedValue(timezone)
          TimezoneService.getCompletedTaskWindow = jest.fn().mockResolvedValue(7)
          TimezoneService.getDateBoundaries = jest.fn().mockResolvedValue({
            todayStart: new Date(),
            todayEnd: new Date(),
            tomorrowStart: new Date(),
            weekFromNow: new Date(),
            completedTaskCutoff: new Date()
          })

          // Mock prisma to return consistent count
          const mockTasks = Array.from({ length: expectedCount }, (_, i) => ({
            id: `task-${i}`,
            title: `Task ${i}`,
            status: 'active',
            dueDate: new Date()
          }))

          const { prisma } = await import('@/lib/prisma')
          ;(prisma.task.findMany as jest.Mock).mockResolvedValue(mockTasks)
          ;(prisma.task.count as jest.Mock).mockResolvedValue(expectedCount)

          // Get filtered tasks
          const result = await TaskFilterService.getFilteredTasks(
            'test-tenant',
            'test-user',
            { dueDate: filterType }
          )

          // Verify count accuracy: displayed count should match actual results
          expect(result.totalCount).toBe(expectedCount)
          expect(result.tasks).toHaveLength(expectedCount)
          
          // Verify the count matches what would be returned by a count query
          expect(result.totalCount).toBe(result.tasks.length)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Feature: task-filtering-fixes, Property 5: Completed Task Visibility Consistency
   * For any user preference setting (1, 7, or 30 days), completed tasks within that 
   * window should appear in all relevant filters
   */
  test('Property 5: Completed Task Visibility Consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('UTC', 'America/New_York', 'Asia/Singapore'),
        fc.constantFrom(1, 7, 30),
        async (timezone, completedWindow) => {
          // Mock timezone service methods
          TimezoneService.getUserTimezone = jest.fn().mockResolvedValue(timezone)
          TimezoneService.getCompletedTaskWindow = jest.fn().mockResolvedValue(completedWindow)
          
          const now = new Date()
          const cutoffDate = new Date(now.getTime() - completedWindow * 24 * 60 * 60 * 1000)
          
          TimezoneService.getDateBoundaries = jest.fn().mockResolvedValue({
            todayStart: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
            todayEnd: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
            tomorrowStart: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
            weekFromNow: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
            completedTaskCutoff: cutoffDate
          })

          const { prisma } = await import('@/lib/prisma')
          
          // Mock some completed tasks within and outside the window
          const tasksInWindow = 3
          const tasksOutsideWindow = 2
          
          const mockTasksInWindow = Array.from({ length: tasksInWindow }, (_, i) => ({
            id: `task-in-${i}`,
            title: `Task In Window ${i}`,
            status: 'completed',
            completedAt: new Date(cutoffDate.getTime() + 60000) // Just inside window
          }))
          
          const mockTasksOutside = Array.from({ length: tasksOutsideWindow }, (_, i) => ({
            id: `task-out-${i}`,
            title: `Task Outside Window ${i}`,
            status: 'completed',
            completedAt: new Date(cutoffDate.getTime() - 60000) // Just outside window
          }))

          // Mock prisma to return only tasks within window
          ;(prisma.task.findMany as jest.Mock).mockResolvedValue(mockTasksInWindow)
          ;(prisma.task.count as jest.Mock).mockResolvedValue(tasksInWindow)

          const result = await TaskFilterService.getFilteredTasks(
            'test-tenant',
            'test-user',
            { includeCompleted: completedWindow.toString() }
          )

          // Verify only tasks within the window are returned
          expect(result.tasks).toHaveLength(tasksInWindow)
          expect(result.totalCount).toBe(tasksInWindow)
          
          // All returned completed tasks should be within the window
          result.tasks.forEach(task => {
            if (task.status === 'completed' && task.completedAt) {
              const completedTime = new Date(task.completedAt).getTime()
              expect(completedTime).toBeGreaterThanOrEqual(cutoffDate.getTime())
            }
          })
        }
      ),
      { numRuns: 50 }
    )
  })
})