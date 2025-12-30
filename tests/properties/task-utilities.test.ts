import * as fc from 'fast-check'
import { isTaskOverdue, isTaskDueToday, isTaskUpcoming } from '@/lib/tasks'
import { TimezoneService } from '@/lib/timezone-service'
import { Task } from '@/types/task'

describe('Task Utilities Property Tests', () => {
  beforeEach(() => {
    TimezoneService.clearAllCache()
  })

  /**
   * Feature: task-filtering-fixes, Property 9: Overdue Identification
   * For any task with a due date and user timezone, the task should be marked as overdue 
   * if and only if its due date is before the current date in the user's timezone and the task is not completed
   */
  test('Property 9: Overdue Identification', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('UTC', 'America/New_York', 'Europe/London', 'Asia/Singapore'),
        fc.record({
          id: fc.string({ minLength: 1 }),
          title: fc.string({ minLength: 1 }),
          status: fc.constantFrom('active', 'completed'),
          dueDate: fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })),
          userId: fc.string({ minLength: 1 }),
          tenantId: fc.string({ minLength: 1 }),
          priority: fc.constantFrom('low', 'medium', 'high', 'urgent'),
          tags: fc.array(fc.string()),
          createdAt: fc.date(),
          updatedAt: fc.date()
        }),
        async (timezone, task) => {
          // Mock timezone service
          TimezoneService.getUserTimezone = jest.fn().mockResolvedValue(timezone)
          
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
          
          TimezoneService.getDateBoundaries = jest.fn().mockResolvedValue({
            todayStart,
            todayEnd: new Date(todayStart.getTime() + 24 * 60 * 60 * 1000),
            tomorrowStart: new Date(todayStart.getTime() + 24 * 60 * 60 * 1000),
            weekFromNow: new Date(todayStart.getTime() + 7 * 24 * 60 * 60 * 1000),
            completedTaskCutoff: new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000)
          })

          const isOverdue = await isTaskOverdue(task as Task, 'test-user')

          // Verify overdue logic
          if (!task.dueDate || task.status === 'completed') {
            expect(isOverdue).toBe(false)
          } else {
            const taskDueTime = new Date(task.dueDate).getTime()
            const expectedOverdue = taskDueTime < todayStart.getTime()
            expect(isOverdue).toBe(expectedOverdue)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Feature: task-filtering-fixes, Property 10: No Due Date Filter Exclusivity
   * For any task without a due date, it should appear in the "No Due Date" filter and All Tasks filter, 
   * but not in any date-based filters (Today, Overdue, Upcoming)
   */
  test('Property 10: No Due Date Filter Exclusivity', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('UTC', 'America/New_York', 'Asia/Singapore'),
        fc.record({
          id: fc.string({ minLength: 1 }),
          title: fc.string({ minLength: 1 }),
          status: fc.constantFrom('active', 'completed'),
          dueDate: fc.constant(null), // No due date
          userId: fc.string({ minLength: 1 }),
          tenantId: fc.string({ minLength: 1 }),
          priority: fc.constantFrom('low', 'medium', 'high', 'urgent'),
          tags: fc.array(fc.string()),
          createdAt: fc.date(),
          updatedAt: fc.date()
        }),
        async (timezone, task) => {
          // Mock timezone service
          TimezoneService.getUserTimezone = jest.fn().mockResolvedValue(timezone)
          TimezoneService.getDateBoundaries = jest.fn().mockResolvedValue({
            todayStart: new Date(),
            todayEnd: new Date(),
            tomorrowStart: new Date(),
            weekFromNow: new Date(),
            completedTaskCutoff: new Date()
          })

          const [isOverdue, isDueToday, isUpcoming] = await Promise.all([
            isTaskOverdue(task as Task, 'test-user'),
            isTaskDueToday(task as Task, 'test-user'),
            isTaskUpcoming(task as Task, 'test-user')
          ])

          // Tasks without due dates should not appear in any date-based filters
          expect(isOverdue).toBe(false)
          expect(isDueToday).toBe(false)
          expect(isUpcoming).toBe(false)
        }
      ),
      { numRuns: 50 }
    )
  })

  test('Task due today identification works correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('UTC', 'America/New_York', 'Europe/London', 'Asia/Singapore'),
        async (timezone) => {
          // Mock timezone service
          TimezoneService.getUserTimezone = jest.fn().mockResolvedValue(timezone)
          
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

          // Create a task due today
          const taskDueToday: Task = {
            id: 'test-task',
            title: 'Test Task',
            status: 'active',
            dueDate: new Date(todayStart.getTime() + 12 * 60 * 60 * 1000), // Noon today
            userId: 'test-user',
            tenantId: 'test-tenant',
            priority: 'medium',
            tags: [],
            createdAt: new Date(),
            updatedAt: new Date()
          }

          const isDueToday = await isTaskDueToday(taskDueToday, 'test-user')
          expect(isDueToday).toBe(true)

          // Create a task due tomorrow
          const taskDueTomorrow: Task = {
            ...taskDueToday,
            dueDate: new Date(todayEnd.getTime() + 12 * 60 * 60 * 1000) // Noon tomorrow
          }

          const isTomorrowDueToday = await isTaskDueToday(taskDueTomorrow, 'test-user')
          expect(isTomorrowDueToday).toBe(false)
        }
      ),
      { numRuns: 30 }
    )
  })

  test('Task upcoming identification works correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('UTC', 'America/New_York', 'Asia/Singapore'),
        async (timezone) => {
          // Mock timezone service
          TimezoneService.getUserTimezone = jest.fn().mockResolvedValue(timezone)
          
          const now = new Date()
          const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)
          const weekFromNow = new Date(tomorrowStart.getTime() + 6 * 24 * 60 * 60 * 1000)
          
          TimezoneService.getDateBoundaries = jest.fn().mockResolvedValue({
            todayStart,
            todayEnd: tomorrowStart,
            tomorrowStart,
            weekFromNow,
            completedTaskCutoff: new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000)
          })

          // Create a task due in 3 days (upcoming)
          const upcomingTask: Task = {
            id: 'upcoming-task',
            title: 'Upcoming Task',
            status: 'active',
            dueDate: new Date(tomorrowStart.getTime() + 2 * 24 * 60 * 60 * 1000),
            userId: 'test-user',
            tenantId: 'test-tenant',
            priority: 'medium',
            tags: [],
            createdAt: new Date(),
            updatedAt: new Date()
          }

          const isUpcoming = await isTaskUpcoming(upcomingTask, 'test-user')
          expect(isUpcoming).toBe(true)

          // Create a task due today (not upcoming)
          const todayTask: Task = {
            ...upcomingTask,
            dueDate: new Date(todayStart.getTime() + 12 * 60 * 60 * 1000)
          }

          const isTodayUpcoming = await isTaskUpcoming(todayTask, 'test-user')
          expect(isTodayUpcoming).toBe(false)
        }
      ),
      { numRuns: 30 }
    )
  })

  test('Completed tasks are never overdue', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('UTC', 'America/New_York', 'Asia/Singapore'),
        fc.date({ min: new Date('2020-01-01'), max: new Date('2025-01-01') }),
        async (timezone, dueDate) => {
          // Mock timezone service
          TimezoneService.getUserTimezone = jest.fn().mockResolvedValue(timezone)
          TimezoneService.getDateBoundaries = jest.fn().mockResolvedValue({
            todayStart: new Date(),
            todayEnd: new Date(),
            tomorrowStart: new Date(),
            weekFromNow: new Date(),
            completedTaskCutoff: new Date()
          })

          const completedTask: Task = {
            id: 'completed-task',
            title: 'Completed Task',
            status: 'completed',
            dueDate,
            completedAt: new Date(),
            userId: 'test-user',
            tenantId: 'test-tenant',
            priority: 'medium',
            tags: [],
            createdAt: new Date(),
            updatedAt: new Date()
          }

          const isOverdue = await isTaskOverdue(completedTask, 'test-user')
          
          // Completed tasks should never be considered overdue
          expect(isOverdue).toBe(false)
        }
      ),
      { numRuns: 50 }
    )
  })
})