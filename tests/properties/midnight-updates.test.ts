import * as fc from 'fast-check'
import { RealtimeUpdateService } from '@/lib/realtime-update-service'
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
    user: {
      findUnique: jest.fn()
    }
  }
}))

describe('Midnight Updates Property Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    TimezoneService.clearAllCache()
    RealtimeUpdateService.clearAllMidnightTimers()
  })

  afterEach(() => {
    RealtimeUpdateService.clearAllMidnightTimers()
  })

  /**
   * Feature: task-filtering-fixes, Property 12: Midnight Filter Updates
   * When midnight occurs in a user's timezone, all date-based filters should be refreshed
   * to reflect the new day boundaries
   */
  test('Property 12: Midnight Filter Updates', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('UTC', 'America/New_York', 'Europe/London', 'Asia/Singapore', 'Australia/Sydney'),
        fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
        async (timezone, userId) => {
          // Mock user timezone
          const { prisma } = await import('@/lib/prisma')
          ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
            preferences: { timezone }
          })

          // Test midnight detection
          const isMidnight = await RealtimeUpdateService.isMidnightForUser(userId)
          
          // The result should be a boolean
          expect(typeof isMidnight).toBe('boolean')
          
          // Test scheduling midnight updates
          await RealtimeUpdateService.scheduleMidnightUpdates(userId)
          
          // Verify timer was created
          const activeTimers = RealtimeUpdateService.getActiveMidnightTimers()
          const userTimer = activeTimers.find(timer => timer.userId === userId)
          
          expect(userTimer).toBeDefined()
          expect(userTimer?.timezone).toBe(timezone)
          expect(userTimer?.scheduledFor).toBeInstanceOf(Date)
          
          // Verify scheduled time is in the future but within 24 hours
          const now = new Date()
          const scheduledTime = userTimer?.scheduledFor
          
          if (scheduledTime) {
            const timeDiff = scheduledTime.getTime() - now.getTime()
            expect(timeDiff).toBeGreaterThan(0) // Should be in the future
            expect(timeDiff).toBeLessThanOrEqual(24 * 60 * 60 * 1000) // Should be within 24 hours
          }
        }
      ),
      { numRuns: 50 }
    )
  })

  test('Midnight timer calculation is consistent', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('UTC', 'America/New_York', 'Europe/London', 'Asia/Singapore'),
        async (timezone) => {
          // Mock user
          const { prisma } = await import('@/lib/prisma')
          ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
            preferences: { timezone }
          })

          const userId = 'test-user'
          
          // Schedule updates multiple times
          await RealtimeUpdateService.scheduleMidnightUpdates(userId)
          const timers1 = RealtimeUpdateService.getActiveMidnightTimers()
          
          // Clear and reschedule
          RealtimeUpdateService.clearMidnightTimer(userId)
          await RealtimeUpdateService.scheduleMidnightUpdates(userId)
          const timers2 = RealtimeUpdateService.getActiveMidnightTimers()
          
          // Should have consistent scheduling
          expect(timers1.length).toBe(1)
          expect(timers2.length).toBe(1)
          
          const timer1 = timers1[0]
          const timer2 = timers2[0]
          
          expect(timer1.timezone).toBe(timer2.timezone)
          expect(timer1.userId).toBe(timer2.userId)
          
          // Times should be close (within a few seconds due to execution time)
          const timeDiff = Math.abs(timer2.scheduledFor.getTime() - timer1.scheduledFor.getTime())
          expect(timeDiff).toBeLessThan(5000) // Within 5 seconds
        }
      ),
      { numRuns: 30 }
    )
  })

  test('Multiple users can have independent midnight timers', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            userId: fc.string({ minLength: 1, maxLength: 10 }).filter(s => s.trim().length > 0),
            timezone: fc.constantFrom('UTC', 'America/New_York', 'Europe/London', 'Asia/Singapore')
          }),
          { minLength: 1, maxLength: 5 }
        ),
        async (users) => {
          // Ensure unique user IDs
          const uniqueUsers = users.filter((user, index, arr) => 
            arr.findIndex(u => u.userId === user.userId) === index
          )
          
          if (uniqueUsers.length === 0) return

          // Mock user preferences
          const { prisma } = await import('@/lib/prisma')
          ;(prisma.user.findUnique as jest.Mock).mockImplementation(({ where }) => {
            const user = uniqueUsers.find(u => u.userId === where.id)
            return Promise.resolve(user ? { preferences: { timezone: user.timezone } } : null)
          })

          // Schedule updates for all users
          for (const user of uniqueUsers) {
            await RealtimeUpdateService.scheduleMidnightUpdates(user.userId)
          }
          
          // Verify all timers are active
          const activeTimers = RealtimeUpdateService.getActiveMidnightTimers()
          expect(activeTimers.length).toBe(uniqueUsers.length)
          
          // Verify each user has their correct timezone
          for (const user of uniqueUsers) {
            const timer = activeTimers.find(t => t.userId === user.userId)
            expect(timer).toBeDefined()
            expect(timer?.timezone).toBe(user.timezone)
          }
          
          // Clear one user's timer
          if (uniqueUsers.length > 1) {
            const userToClear = uniqueUsers[0]
            RealtimeUpdateService.clearMidnightTimer(userToClear.userId)
            
            const remainingTimers = RealtimeUpdateService.getActiveMidnightTimers()
            expect(remainingTimers.length).toBe(uniqueUsers.length - 1)
            expect(remainingTimers.find(t => t.userId === userToClear.userId)).toBeUndefined()
          }
        }
      ),
      { numRuns: 30 }
    )
  })

  test('Cleanup functions work correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            userId: fc.string({ minLength: 1, maxLength: 10 }).filter(s => s.trim().length > 0),
            timezone: fc.constantFrom('UTC', 'America/New_York', 'Europe/London')
          }),
          { minLength: 1, maxLength: 3 }
        ),
        async (users) => {
          // Ensure unique user IDs
          const uniqueUsers = users.filter((user, index, arr) => 
            arr.findIndex(u => u.userId === user.userId) === index
          )
          
          if (uniqueUsers.length === 0) return

          // Mock user preferences
          const { prisma } = await import('@/lib/prisma')
          ;(prisma.user.findUnique as jest.Mock).mockImplementation(({ where }) => {
            const user = uniqueUsers.find(u => u.userId === where.id)
            return Promise.resolve(user ? { preferences: { timezone: user.timezone } } : null)
          })

          // Schedule updates for all users
          for (const user of uniqueUsers) {
            await RealtimeUpdateService.scheduleMidnightUpdates(user.userId)
          }
          
          // Verify timers are active
          let activeTimers = RealtimeUpdateService.getActiveMidnightTimers()
          expect(activeTimers.length).toBe(uniqueUsers.length)
          
          // Clear all timers
          RealtimeUpdateService.clearAllMidnightTimers()
          
          // Verify all timers are cleared
          activeTimers = RealtimeUpdateService.getActiveMidnightTimers()
          expect(activeTimers.length).toBe(0)
        }
      ),
      { numRuns: 20 }
    )
  })

  test('Force refresh works for all active users', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            userId: fc.string({ minLength: 1, maxLength: 10 }).filter(s => s.trim().length > 0),
            timezone: fc.constantFrom('UTC', 'America/New_York', 'Europe/London')
          }),
          { minLength: 0, maxLength: 3 }
        ),
        async (users) => {
          // Ensure unique user IDs
          const uniqueUsers = users.filter((user, index, arr) => 
            arr.findIndex(u => u.userId === user.userId) === index
          )

          // Mock user preferences
          const { prisma } = await import('@/lib/prisma')
          ;(prisma.user.findUnique as jest.Mock).mockImplementation(({ where }) => {
            const user = uniqueUsers.find(u => u.userId === where.id)
            return Promise.resolve(user ? { preferences: { timezone: user.timezone } } : null)
          })

          // Schedule updates for all users
          for (const user of uniqueUsers) {
            await RealtimeUpdateService.scheduleMidnightUpdates(user.userId)
          }
          
          // Force refresh should not throw errors
          await expect(RealtimeUpdateService.forceRefreshAllFilters()).resolves.not.toThrow()
          
          // Timers should still be active after force refresh
          const activeTimers = RealtimeUpdateService.getActiveMidnightTimers()
          expect(activeTimers.length).toBe(uniqueUsers.length)
        }
      ),
      { numRuns: 20 }
    )
  })
})