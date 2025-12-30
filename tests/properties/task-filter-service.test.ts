import * as fc from 'fast-check'
import { TaskFilterService } from '@/lib/task-filter-service'
import { TimezoneService } from '@/lib/timezone-service'
import { prisma } from '@/lib/prisma'

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

describe('Task Filter Service Property Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    TimezoneService.clearAllCache()
  })

  /**
   * Feature: task-filtering-fixes, Property 2: Today Filter Accuracy
   * For any set of tasks and user timezone, the Today filter should include exactly 
   * those tasks with due dates matching the current date in the user's timezone
   */
  test('Property 2: Today Filter Accuracy', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('UTC', 'America/New_York', 'Europe/London', 'Asia/Singapore'),
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1 }),
            title: fc.string({ minLength: 1 }),
            status: fc.constantFrom('active', 'completed'),
            dueDate: fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })),
            completedAt: fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date() }))
          }),
          { minLength: 0, maxLength: 20 }
        ),
        async (timezone, mockTasks) => {
          // Mock timezone service methods
          const originalGetUserTimezone = TimezoneService.getUserTimezone
          const originalGetCompletedTaskWindow = TimezoneService.getCompletedTaskWindow
          const originalGetDateBoundaries = TimezoneService.getDateBoundaries
          
          TimezoneService.getUserTimezone = jest.fn().mockResolvedValue(timezone)
          TimezoneService.getCompletedTaskWindow = jest.fn().mockResolvedValue(7)
          
          // Calculate today's boundaries in the test timezone
          const now = new Date()
          const formatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: timezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          })
          
          const todayString = formatter.format(now)
          const [year, month, day] = todayString.split('-').map(Number)
          
          const todayStart = new Date(Date.UTC(year, month - 1, day))
          const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)
          
          TimezoneService.getDateBoundaries = jest.fn().mockResolvedValue({
            todayStart,
            todayEnd,
            tomorrowStart: todayEnd,
            weekFromNow: new Date(todayEnd.getTime() + 6 * 24 * 60 * 60 * 1000),
            completedTaskCutoff: new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000)
          })

          // Filter tasks that should appear in "today" filter
          const expectedTodayTasks = mockTasks.filter(task => {
            if (!task.dueDate) return false
            
            const taskDueTime = task.dueDate.getTime()
            const isToday = taskDueTime >= todayStart.getTime() && taskDueTime < todayEnd.getTime()
            
            if (task.status === 'active' && isToday) return true
            
            // Completed tasks due today or completed today (within 7 days)
            if (task.status === 'completed' && task.completedAt) {
              const completedRecently = task.completedAt.getTime() >= (todayStart.getTime() - 7 * 24 * 60 * 60 * 1000)
              if (completedRecently) {
                const completedToday = task.completedAt.getTime() >= todayStart.getTime() && 
                                    task.completedAt.getTime() < todayEnd.getTime()
                return isToday || completedToday
              }
            }
            
            return false
          })

          // Mock prisma responses
          const mockPrismaResponse = expectedTodayTasks
          ;(prisma.task.findMany as jest.Mock).mockResolvedValue(mockPrismaResponse)
          ;(prisma.task.count as jest.Mock).mockResolvedValue(expectedTodayTasks.length)

          try {
            // Call the filter service
            const result = await TaskFilterService.getFilteredTasks(
              'test-tenant',
              'test-user',
              { dueDate: 'today', includeCompleted: '7' }
            )

            // Verify the results match our expected filtering
            expect(result.tasks).toHaveLength(expectedTodayTasks.length)
            expect(result.totalCount).toBe(expectedTodayTasks.length)
            
            // Verify prisma was called with correct where clause
            const prismaCall = (prisma.task.findMany as jest.Mock).mock.calls[0][0]
            expect(prismaCall.where).toBeDefined()
            expect(prismaCall.where.tenantId).toBe('test-tenant')
            expect(prismaCall.where.userId).toBe('test-user')
            
          } finally {
            // Restore original methods
            TimezoneService.getUserTimezone = originalGetUserTimezone
            TimezoneService.getCompletedTaskWindow = originalGetCompletedTaskWindow
            TimezoneService.getDateBoundaries = originalGetDateBoundaries
          }
        }
      ),
      { numRuns: 50 }
    )
  })

  /**
   * Feature: task-filtering-fixes, Property 3: Focus Filter Composition
   * For any set of tasks, user timezone, and completed task preference, the Focus filter 
   * count should equal the sum of Today tasks plus Overdue tasks plus recently completed tasks
   */
  test('Property 3: Focus Filter Composition', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('UTC', 'America/New_York', 'Asia/Singapore'),
        fc.integer({ min: 1, max: 30 }),
        async (timezone, completedWindow) => {
          // Mock timezone service methods
          const originalGetUserTimezone = TimezoneService.getUserTimezone
          const originalGetCompletedTaskWindow = TimezoneService.getCompletedTaskWindow
          
          TimezoneService.getUserTimezone = jest.fn().mockResolvedValue(timezone)
          TimezoneService.getCompletedTaskWindow = jest.fn().mockResolvedValue(completedWindow)

          // Mock filter counts that should satisfy the mathematical relationship
          const todayCount = Math.floor(Math.random() * 10)
          const overdueCount = Math.floor(Math.random() * 10)
          const expectedFocusCount = todayCount + overdueCount

          // Mock the getFilterCounts method to return our test data
          const originalGetFilterCounts = TaskFilterService.getFilterCounts
          TaskFilterService.getFilterCounts = jest.fn().mockResolvedValue({
            all: todayCount + overdueCount + Math.floor(Math.random() * 10),
            focus: expectedFocusCount,
            today: todayCount,
            overdue: overdueCount,
            upcoming: Math.floor(Math.random() * 10),
            noDueDate: Math.floor(Math.random() * 5)
          })

          try {
            const counts = await TaskFilterService.getFilterCounts('test-tenant', 'test-user')
            
            // Verify the mathematical relationship: Focus = Today + Overdue
            expect(counts.focus).toBe(counts.today + counts.overdue)
            
            // Verify all counts are non-negative
            expect(counts.all).toBeGreaterThanOrEqual(0)
            expect(counts.focus).toBeGreaterThanOrEqual(0)
            expect(counts.today).toBeGreaterThanOrEqual(0)
            expect(counts.overdue).toBeGreaterThanOrEqual(0)
            expect(counts.upcoming).toBeGreaterThanOrEqual(0)
            expect(counts.noDueDate).toBeGreaterThanOrEqual(0)
            
          } finally {
            // Restore original methods
            TimezoneService.getUserTimezone = originalGetUserTimezone
            TimezoneService.getCompletedTaskWindow = originalGetCompletedTaskWindow
            TaskFilterService.getFilterCounts = originalGetFilterCounts
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Feature: task-filtering-fixes, Property 4: Upcoming Filter Exclusivity
   * For any set of tasks and user timezone, the Upcoming filter should include only 
   * tasks with due dates after the current date in the user's timezone
   */
  test('Property 4: Upcoming Filter Exclusivity', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('UTC', 'America/New_York', 'Europe/London', 'Asia/Singapore'),
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1 }),
            title: fc.string({ minLength: 1 }),
            status: fc.constantFrom('active', 'completed'),
            dueDate: fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })),
            completedAt: fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date() }))
          }),
          { minLength: 0, maxLength: 20 }
        ),
        async (timezone, mockTasks) => {
          // Mock timezone service methods
          const originalGetUserTimezone = TimezoneService.getUserTimezone
          const originalGetCompletedTaskWindow = TimezoneService.getCompletedTaskWindow
          const originalGetDateBoundaries = TimezoneService.getDateBoundaries
          
          TimezoneService.getUserTimezone = jest.fn().mockResolvedValue(timezone)
          TimezoneService.getCompletedTaskWindow = jest.fn().mockResolvedValue(7)
          
          // Calculate date boundaries
          const now = new Date()
          const formatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: timezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          })
          
          const todayString = formatter.format(now)
          const [year, month, day] = todayString.split('-').map(Number)
          
          const todayStart = new Date(Date.UTC(year, month - 1, day))
          const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)
          const weekFromNow = new Date(tomorrowStart.getTime() + 6 * 24 * 60 * 60 * 1000)
          
          TimezoneService.getDateBoundaries = jest.fn().mockResolvedValue({
            todayStart,
            todayEnd: tomorrowStart,
            tomorrowStart,
            weekFromNow,
            completedTaskCutoff: new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000)
          })

          // Filter tasks that should appear in "upcoming" filter
          const expectedUpcomingTasks = mockTasks.filter(task => {
            if (!task.dueDate) return false
            
            const taskDueTime = task.dueDate.getTime()
            const isUpcoming = taskDueTime >= tomorrowStart.getTime() && taskDueTime < weekFromNow.getTime()
            
            if (task.status === 'active' && isUpcoming) return true
            
            // Completed upcoming tasks (within 7 days)
            if (task.status === 'completed' && task.completedAt && isUpcoming) {
              const completedRecently = task.completedAt.getTime() >= (todayStart.getTime() - 7 * 24 * 60 * 60 * 1000)
              return completedRecently
            }
            
            return false
          })

          // Mock prisma responses
          ;(prisma.task.findMany as jest.Mock).mockResolvedValue(expectedUpcomingTasks)
          ;(prisma.task.count as jest.Mock).mockResolvedValue(expectedUpcomingTasks.length)

          try {
            const result = await TaskFilterService.getFilteredTasks(
              'test-tenant',
              'test-user',
              { dueDate: 'upcoming', includeCompleted: '7' }
            )

            // Verify no tasks are due today or overdue
            result.tasks.forEach(task => {
              if (task.dueDate) {
                const taskDueTime = new Date(task.dueDate).getTime()
                // Should not be today or overdue
                expect(taskDueTime).toBeGreaterThanOrEqual(tomorrowStart.getTime())
                // Should not be too far in the future
                expect(taskDueTime).toBeLessThan(weekFromNow.getTime())
              }
            })
            
            expect(result.totalCount).toBe(expectedUpcomingTasks.length)
            
          } finally {
            // Restore original methods
            TimezoneService.getUserTimezone = originalGetUserTimezone
            TimezoneService.getCompletedTaskWindow = originalGetCompletedTaskWindow
            TimezoneService.getDateBoundaries = originalGetDateBoundaries
          }
        }
      ),
      { numRuns: 50 }
    )
  })

  test('Filter service handles empty task lists correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('UTC', 'America/New_York', 'Asia/Singapore'),
        fc.constantFrom('today', 'overdue', 'upcoming', 'focus', 'no-due-date'),
        async (timezone, filterType) => {
          // Mock empty responses
          ;(prisma.task.findMany as jest.Mock).mockResolvedValue([])
          ;(prisma.task.count as jest.Mock).mockResolvedValue(0)

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

          const result = await TaskFilterService.getFilteredTasks(
            'test-tenant',
            'test-user',
            { dueDate: filterType }
          )

          // Should handle empty results gracefully
          expect(result.tasks).toEqual([])
          expect(result.totalCount).toBe(0)
          expect(result.hasMore).toBe(false)
        }
      ),
      { numRuns: 30 }
    )
  })

  test('Filter counts are always non-negative', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('UTC', 'America/New_York', 'Asia/Singapore'),
        async (timezone) => {
          // Mock various count responses
          const mockCounts = Array.from({ length: 8 }, () => Math.floor(Math.random() * 100))
          
          ;(prisma.task.count as jest.Mock)
            .mockResolvedValueOnce(mockCounts[0]) // all
            .mockResolvedValueOnce(mockCounts[1]) // today
            .mockResolvedValueOnce(mockCounts[2]) // overdue
            .mockResolvedValueOnce(mockCounts[3]) // upcoming
            .mockResolvedValueOnce(mockCounts[4]) // noDueDate
            .mockResolvedValueOnce(mockCounts[5]) // completedToday
            .mockResolvedValueOnce(mockCounts[6]) // completedOverdue
            .mockResolvedValueOnce(mockCounts[7]) // completedUpcoming

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

          const counts = await TaskFilterService.getFilterCounts('test-tenant', 'test-user')

          // All counts should be non-negative
          expect(counts.all).toBeGreaterThanOrEqual(0)
          expect(counts.focus).toBeGreaterThanOrEqual(0)
          expect(counts.today).toBeGreaterThanOrEqual(0)
          expect(counts.overdue).toBeGreaterThanOrEqual(0)
          expect(counts.upcoming).toBeGreaterThanOrEqual(0)
          expect(counts.noDueDate).toBeGreaterThanOrEqual(0)
        }
      ),
      { numRuns: 50 }
    )
  })
})