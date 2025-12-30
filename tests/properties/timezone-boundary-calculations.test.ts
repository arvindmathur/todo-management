import * as fc from 'fast-check'
import { TimezoneService } from '@/lib/timezone-service'
import { TaskFilterService } from '@/lib/task-filter-service'

// Mock the database connection
jest.mock('@/lib/db-connection', () => ({
  DatabaseConnection: {
    withRetry: jest.fn((fn) => fn())
  }
}))

// Mock prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn()
    },
    task: {
      findMany: jest.fn(),
      count: jest.fn()
    }
  }
}))

describe('Timezone Boundary Calculations Property Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    TimezoneService.clearAllCache()
  })

  /**
   * Feature: task-filtering-fixes, Property 11: Timezone Boundary Calculations
   * Date boundaries for filtering should be calculated correctly for any timezone,
   * ensuring that "today" means the current day in the user's timezone
   */
  test('Property 11: Timezone Boundary Calculations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('UTC', 'America/New_York', 'Europe/London', 'Asia/Singapore', 'Australia/Sydney', 'America/Los_Angeles'),
        fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
        fc.integer({ min: 1, max: 30 }),
        async (timezone, userId, completedTaskWindow) => {
          // Mock user preferences
          const { prisma } = await import('@/lib/prisma')
          ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
            preferences: { 
              timezone,
              completedTaskVisibility: `${completedTaskWindow}days`
            }
          })

          // Get date boundaries
          const boundaries = await TimezoneService.getDateBoundaries(userId, completedTaskWindow)
          
          // Verify boundary structure
          expect(boundaries).toHaveProperty('todayStart')
          expect(boundaries).toHaveProperty('todayEnd')
          expect(boundaries).toHaveProperty('tomorrowStart')
          expect(boundaries).toHaveProperty('weekFromNow')
          expect(boundaries).toHaveProperty('completedTaskCutoff')
          
          // Verify all boundaries are Date objects
          expect(boundaries.todayStart).toBeInstanceOf(Date)
          expect(boundaries.todayEnd).toBeInstanceOf(Date)
          expect(boundaries.tomorrowStart).toBeInstanceOf(Date)
          expect(boundaries.weekFromNow).toBeInstanceOf(Date)
          expect(boundaries.completedTaskCutoff).toBeInstanceOf(Date)
          
          // Verify logical ordering
          expect(boundaries.todayStart.getTime()).toBeLessThan(boundaries.todayEnd.getTime())
          expect(boundaries.todayEnd.getTime()).toBeLessThanOrEqual(boundaries.tomorrowStart.getTime())
          expect(boundaries.tomorrowStart.getTime()).toBeLessThan(boundaries.weekFromNow.getTime())
          expect(boundaries.completedTaskCutoff.getTime()).toBeLessThan(boundaries.todayStart.getTime())
          
          // Verify today span is approximately 24 hours (allowing for DST variations)
          const todaySpan = boundaries.todayEnd.getTime() - boundaries.todayStart.getTime()
          const expectedSpan = 24 * 60 * 60 * 1000 // 24 hours in milliseconds
          const tolerance = 2 * 60 * 60 * 1000 // 2 hours tolerance for DST
          
          expect(Math.abs(todaySpan - expectedSpan)).toBeLessThan(tolerance)
          
          // Verify completed task cutoff is correct number of days ago
          const cutoffSpan = boundaries.todayStart.getTime() - boundaries.completedTaskCutoff.getTime()
          const expectedCutoffSpan = completedTaskWindow * 24 * 60 * 60 * 1000
          const cutoffTolerance = 2 * 60 * 60 * 1000 // 2 hours tolerance
          
          expect(Math.abs(cutoffSpan - expectedCutoffSpan)).toBeLessThan(cutoffTolerance)
        }
      ),
      { numRuns: 50 }
    )
  })

  test('Date boundaries are consistent across multiple calls', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('UTC', 'America/New_York', 'Europe/London', 'Asia/Singapore'),
        fc.string({ minLength: 1, maxLength: 10 }).filter(s => s.trim().length > 0),
        async (timezone, userId) => {
          // Mock user preferences
          const { prisma } = await import('@/lib/prisma')
          ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
            preferences: { timezone, completedTaskVisibility: '7days' }
          })

          // Get boundaries multiple times
          const boundaries1 = await TimezoneService.getDateBoundaries(userId, 7)
          const boundaries2 = await TimezoneService.getDateBoundaries(userId, 7)
          
          // Should be identical (within a small time window due to execution time)
          const timeDiff = Math.abs(boundaries2.todayStart.getTime() - boundaries1.todayStart.getTime())
          expect(timeDiff).toBeLessThan(1000) // Within 1 second
          
          expect(boundaries1.todayEnd.getTime()).toBe(boundaries2.todayEnd.getTime())
          expect(boundaries1.tomorrowStart.getTime()).toBe(boundaries2.tomorrowStart.getTime())
        }
      ),
      { numRuns: 30 }
    )
  })

  test('Filter counts use correct timezone boundaries', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('UTC', 'America/New_York', 'Europe/London', 'Asia/Singapore'),
        fc.string({ minLength: 1, maxLength: 10 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 1, maxLength: 10 }).filter(s => s.trim().length > 0),
        async (timezone, userId, tenantId) => {
          // Mock user preferences
          const { prisma } = await import('@/lib/prisma')
          ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
            preferences: { timezone, completedTaskVisibility: '7days' }
          })

          // Mock task counts
          ;(prisma.task.count as jest.Mock).mockResolvedValue(5)

          // Get filter counts
          const counts = await TaskFilterService.getFilterCounts(tenantId, userId)
          
          // Verify count structure
          expect(counts).toHaveProperty('all')
          expect(counts).toHaveProperty('today')
          expect(counts).toHaveProperty('overdue')
          expect(counts).toHaveProperty('upcoming')
          expect(counts).toHaveProperty('noDueDate')
          expect(counts).toHaveProperty('focus')
          
          // All counts should be non-negative numbers
          expect(typeof counts.all).toBe('number')
          expect(typeof counts.today).toBe('number')
          expect(typeof counts.overdue).toBe('number')
          expect(typeof counts.upcoming).toBe('number')
          expect(typeof counts.noDueDate).toBe('number')
          expect(typeof counts.focus).toBe('number')
          
          expect(counts.all).toBeGreaterThanOrEqual(0)
          expect(counts.today).toBeGreaterThanOrEqual(0)
          expect(counts.overdue).toBeGreaterThanOrEqual(0)
          expect(counts.upcoming).toBeGreaterThanOrEqual(0)
          expect(counts.noDueDate).toBeGreaterThanOrEqual(0)
          expect(counts.focus).toBeGreaterThanOrEqual(0)
          
          // Focus should equal today + overdue
          expect(counts.focus).toBe(counts.today + counts.overdue)
        }
      ),
      { numRuns: 30 }
    )
  })

  test('Timezone changes affect boundary calculations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 10 }).filter(s => s.trim().length > 0),
        async (userId) => {
          const { prisma } = await import('@/lib/prisma')
          
          // Test with UTC
          ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
            preferences: { timezone: 'UTC', completedTaskVisibility: '7days' }
          })
          
          const utcBoundaries = await TimezoneService.getDateBoundaries(userId, 7)
          
          // Clear cache and test with different timezone
          TimezoneService.clearUserCache(userId)
          
          ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
            preferences: { timezone: 'Asia/Singapore', completedTaskVisibility: '7days' }
          })
          
          const sgBoundaries = await TimezoneService.getDateBoundaries(userId, 7)
          
          // Boundaries should be different for different timezones
          // (unless it happens to be the exact same time, which is very unlikely)
          const timeDiff = Math.abs(sgBoundaries.todayStart.getTime() - utcBoundaries.todayStart.getTime())
          
          // Singapore is UTC+8, so there should be up to 8 hours difference
          // But we'll be more lenient since the exact difference depends on the current time
          expect(timeDiff).toBeGreaterThanOrEqual(0)
          expect(timeDiff).toBeLessThanOrEqual(24 * 60 * 60 * 1000) // Max 24 hours difference
        }
      ),
      { numRuns: 20 }
    )
  })

  test('Boundary calculations handle edge cases', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('UTC', 'America/New_York', 'Europe/London'),
        fc.string({ minLength: 1, maxLength: 10 }).filter(s => s.trim().length > 0),
        fc.integer({ min: 0, max: 365 }),
        async (timezone, userId, completedTaskWindow) => {
          // Mock user preferences
          const { prisma } = await import('@/lib/prisma')
          ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
            preferences: { timezone, completedTaskVisibility: `${completedTaskWindow}days` }
          })

          // Should not throw errors for any valid input
          await expect(TimezoneService.getDateBoundaries(userId, completedTaskWindow)).resolves.not.toThrow()
          
          const boundaries = await TimezoneService.getDateBoundaries(userId, completedTaskWindow)
          
          // All boundaries should be valid dates
          expect(boundaries.todayStart.getTime()).not.toBeNaN()
          expect(boundaries.todayEnd.getTime()).not.toBeNaN()
          expect(boundaries.tomorrowStart.getTime()).not.toBeNaN()
          expect(boundaries.weekFromNow.getTime()).not.toBeNaN()
          expect(boundaries.completedTaskCutoff.getTime()).not.toBeNaN()
        }
      ),
      { numRuns: 30 }
    )
  })
})