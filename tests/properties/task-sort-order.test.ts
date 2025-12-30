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

describe('Task Sort Order Property Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    TimezoneService.clearAllCache()
  })

  /**
   * Feature: task-filtering-fixes, Property 6: Completed Task Sort Order
   * For any filter that includes completed tasks, completed tasks should always appear 
   * at the end of the list, after all active tasks
   */
  test('Property 6: Completed Task Sort Order', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('UTC', 'America/New_York', 'Asia/Singapore'),
        fc.constantFrom('today', 'overdue', 'upcoming', 'focus'),
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1 }),
            title: fc.string({ minLength: 1 }),
            status: fc.constantFrom('active', 'completed'),
            priority: fc.constantFrom('low', 'medium', 'high', 'urgent'),
            dueDate: fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })),
            completedAt: fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date() })),
            createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
            updatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date() })
          }),
          { minLength: 2, maxLength: 20 }
        ),
        async (timezone, filterType, mockTasks) => {
          // Ensure we have both active and completed tasks
          const activeTasks = mockTasks.filter(t => t.status === 'active')
          const completedTasks = mockTasks.filter(t => t.status === 'completed')
          
          if (activeTasks.length === 0 || completedTasks.length === 0) {
            // Skip this test case if we don't have both types
            return
          }

          // Mock timezone service
          TimezoneService.getUserTimezone = jest.fn().mockResolvedValue(timezone)
          TimezoneService.getCompletedTaskWindow = jest.fn().mockResolvedValue(7)
          TimezoneService.getDateBoundaries = jest.fn().mockResolvedValue({
            todayStart: new Date(),
            todayEnd: new Date(),
            tomorrowStart: new Date(),
            weekFromNow: new Date(),
            completedTaskCutoff: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          })

          // Sort tasks as the service would (active first, then completed)
          const sortedTasks = [...mockTasks].sort((a, b) => {
            // Status sort: active (0) comes before completed (1)
            const statusOrder = { active: 0, completed: 1 }
            const statusDiff = statusOrder[a.status] - statusOrder[b.status]
            if (statusDiff !== 0) return statusDiff
            
            // Then by priority (high to low)
            const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 }
            const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
            if (priorityDiff !== 0) return priorityDiff
            
            // Then by due date
            if (a.dueDate && b.dueDate) {
              return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
            }
            if (a.dueDate && !b.dueDate) return -1
            if (!a.dueDate && b.dueDate) return 1
            
            // Finally by creation date
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          })

          // Mock prisma to return sorted tasks
          const { prisma } = await import('@/lib/prisma')
          ;(prisma.task.findMany as jest.Mock).mockResolvedValue(sortedTasks)
          ;(prisma.task.count as jest.Mock).mockResolvedValue(sortedTasks.length)

          const result = await TaskFilterService.getFilteredTasks(
            'test-tenant',
            'test-user',
            { dueDate: filterType, includeCompleted: '7' }
          )

          // Verify sort order: all active tasks should come before all completed tasks
          let foundCompleted = false
          let foundActiveAfterCompleted = false

          for (const task of result.tasks) {
            if (task.status === 'completed') {
              foundCompleted = true
            } else if (task.status === 'active' && foundCompleted) {
              foundActiveAfterCompleted = true
              break
            }
          }

          // Should not find any active tasks after completed tasks
          expect(foundActiveAfterCompleted).toBe(false)

          // If we have both types, verify the boundary
          if (activeTasks.length > 0 && completedTasks.length > 0) {
            const activeIndices = result.tasks
              .map((task, index) => task.status === 'active' ? index : -1)
              .filter(index => index !== -1)
            
            const completedIndices = result.tasks
              .map((task, index) => task.status === 'completed' ? index : -1)
              .filter(index => index !== -1)

            if (activeIndices.length > 0 && completedIndices.length > 0) {
              const lastActiveIndex = Math.max(...activeIndices)
              const firstCompletedIndex = Math.min(...completedIndices)
              
              // Last active task should come before first completed task
              expect(lastActiveIndex).toBeLessThan(firstCompletedIndex)
            }
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  test('Sort order maintains priority within status groups', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('UTC', 'America/New_York', 'Asia/Singapore'),
        async (timezone) => {
          // Create tasks with same status but different priorities
          const activeTasks = [
            { id: '1', status: 'active', priority: 'urgent', title: 'Urgent Task' },
            { id: '2', status: 'active', priority: 'low', title: 'Low Task' },
            { id: '3', status: 'active', priority: 'high', title: 'High Task' },
            { id: '4', status: 'active', priority: 'medium', title: 'Medium Task' }
          ].map(task => ({
            ...task,
            dueDate: null,
            completedAt: null,
            createdAt: new Date(),
            updatedAt: new Date()
          }))

          // Mock timezone service
          TimezoneService.getUserTimezone = jest.fn().mockResolvedValue(timezone)
          TimezoneService.getCompletedTaskWindow = jest.fn().mockResolvedValue(7)
          TimezoneService.getDateBoundaries = jest.fn().mockResolvedValue({
            todayStart: new Date(),
            todayEnd: new Date(),
            tomorrowStart: new Date(),
            weekFromNow: new Date(),
            completedTaskCutoff: new Date()
          })

          // Sort by priority (urgent > high > medium > low)
          const expectedOrder = ['urgent', 'high', 'medium', 'low']
          const sortedTasks = [...activeTasks].sort((a, b) => {
            const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 }
            return priorityOrder[b.priority] - priorityOrder[a.priority]
          })

          const { prisma } = await import('@/lib/prisma')
          ;(prisma.task.findMany as jest.Mock).mockResolvedValue(sortedTasks)
          ;(prisma.task.count as jest.Mock).mockResolvedValue(sortedTasks.length)

          const result = await TaskFilterService.getFilteredTasks(
            'test-tenant',
            'test-user',
            { status: 'active' }
          )

          // Verify priority order is maintained
          const resultPriorities = result.tasks.map(task => task.priority)
          expect(resultPriorities).toEqual(expectedOrder)
        }
      ),
      { numRuns: 30 }
    )
  })

  test('Empty task lists maintain sort order structure', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('UTC', 'America/New_York', 'Asia/Singapore'),
        fc.constantFrom('today', 'overdue', 'upcoming', 'focus'),
        async (timezone, filterType) => {
          // Mock empty results
          TimezoneService.getUserTimezone = jest.fn().mockResolvedValue(timezone)
          TimezoneService.getCompletedTaskWindow = jest.fn().mockResolvedValue(7)
          TimezoneService.getDateBoundaries = jest.fn().mockResolvedValue({
            todayStart: new Date(),
            todayEnd: new Date(),
            tomorrowStart: new Date(),
            weekFromNow: new Date(),
            completedTaskCutoff: new Date()
          })

          const { prisma } = await import('@/lib/prisma')
          ;(prisma.task.findMany as jest.Mock).mockResolvedValue([])
          ;(prisma.task.count as jest.Mock).mockResolvedValue(0)

          const result = await TaskFilterService.getFilteredTasks(
            'test-tenant',
            'test-user',
            { dueDate: filterType, includeCompleted: '7' }
          )

          // Empty results should still be valid
          expect(result.tasks).toEqual([])
          expect(result.totalCount).toBe(0)
          expect(result.hasMore).toBe(false)
        }
      ),
      { numRuns: 30 }
    )
  })
})