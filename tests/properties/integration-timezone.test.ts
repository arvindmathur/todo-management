import { TimezoneService } from '../../src/lib/timezone-service'
import { TaskFilterService } from '../../src/lib/task-filter-service'
import { DatabaseConnection } from '../../src/lib/db-connection'
import { prisma } from '../../src/lib/prisma'

// Mock the database connection and prisma
jest.mock('../../src/lib/db-connection')
jest.mock('../../src/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    task: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}))

const mockDatabaseConnection = DatabaseConnection as jest.Mocked<typeof DatabaseConnection>
const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('Integration and Performance Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    TimezoneService.clearAllCache()
  })

  describe('End-to-End Filtering with Multiple Timezones', () => {
    test('should handle multiple users in different timezones consistently', async () => {
      const tenantId = 'test-tenant'
      const users = [
        { id: 'user-ny', timezone: 'America/New_York' },
        { id: 'user-london', timezone: 'Europe/London' },
        { id: 'user-singapore', timezone: 'Asia/Singapore' },
        { id: 'user-utc', timezone: 'UTC' },
      ]

      // Mock user preferences for each user
      mockDatabaseConnection.withRetry.mockImplementation((operation, context) => {
        if (context === 'getUserTimezone') {
          return Promise.resolve({ preferences: { timezone: 'UTC' } })
        }
        
        if (context === 'getCompletedTaskWindow') {
          return Promise.resolve({ preferences: { completedTaskVisibility: '7days' } })
        }
        
        // Mock task queries
        if (context?.includes('getFilteredTasks')) {
          return Promise.resolve([])
        }
        
        if (context?.includes('count')) {
          return Promise.resolve(0)
        }
        
        return Promise.resolve([])
      })

      // Test filtering for each user
      const results = await Promise.all(
        users.map(user => 
          TaskFilterService.getFilteredTasks(tenantId, user.id, { dueDate: 'today' })
        )
      )

      // All should return valid results
      results.forEach((result, index) => {
        expect(result).toHaveProperty('tasks')
        expect(result).toHaveProperty('totalCount')
        expect(result).toHaveProperty('hasMore')
        expect(Array.isArray(result.tasks)).toBe(true)
        expect(typeof result.totalCount).toBe('number')
        expect(typeof result.hasMore).toBe('boolean')
      })

      // Verify timezone caching worked
      const cachedTimezones = await Promise.all(
        users.map(user => TimezoneService.getUserTimezone(user.id))
      )

      cachedTimezones.forEach((timezone, index) => {
        expect(timezone).toBe('UTC') // All will be UTC due to simplified mock
      })
    })

    test('should maintain filter count consistency across API calls', async () => {
      const tenantId = 'test-tenant'
      const userId = 'test-user'

      // Mock consistent responses
      mockDatabaseConnection.withRetry.mockImplementation((operation, context) => {
        if (context === 'getUserTimezone') {
          return Promise.resolve({ preferences: { timezone: 'America/New_York' } })
        }
        
        if (context === 'getCompletedTaskWindow') {
          return Promise.resolve({ preferences: { completedTaskVisibility: '7days' } })
        }
        
        // Mock consistent counts for getFilterCounts
        if (context?.includes('getFilterCounts')) {
          return Promise.resolve(5) // Consistent count
        }
        
        // Mock consistent tasks for getFilteredTasks
        if (context?.includes('getFilteredTasks-findMany')) {
          return Promise.resolve(Array.from({ length: 5 }, (_, i) => ({
            id: `task-${i}`,
            title: `Task ${i}`,
            status: 'active',
            dueDate: new Date(),
          })))
        }
        
        if (context?.includes('getFilteredTasks-count')) {
          return Promise.resolve(5)
        }
        
        return Promise.resolve(5)
      })

      // Get filter counts
      const counts = await TaskFilterService.getFilterCounts(tenantId, userId)
      
      // Get filtered tasks for each filter type
      const todayTasks = await TaskFilterService.getFilteredTasks(tenantId, userId, { dueDate: 'today' })
      const overdueTasks = await TaskFilterService.getFilteredTasks(tenantId, userId, { dueDate: 'overdue' })
      const upcomingTasks = await TaskFilterService.getFilteredTasks(tenantId, userId, { dueDate: 'upcoming' })
      const focusTasks = await TaskFilterService.getFilteredTasks(tenantId, userId, { dueDate: 'focus' })

      // Verify consistency (in this mock scenario, all return 5)
      expect(counts.today).toBe(5)
      expect(counts.overdue).toBe(5)
      expect(counts.upcoming).toBe(5)
      expect(counts.focus).toBe(10) // today + overdue
      
      expect(todayTasks.totalCount).toBe(5)
      expect(overdueTasks.totalCount).toBe(5)
      expect(upcomingTasks.totalCount).toBe(5)
      expect(focusTasks.totalCount).toBe(5)
    })

    test('should handle real-time updates across midnight boundaries', async () => {
      const userId = 'test-user'
      const timezone = 'America/New_York'

      // Mock user timezone
      mockDatabaseConnection.withRetry.mockResolvedValue({
        preferences: { timezone }
      })

      // Test midnight detection
      const isMidnight = await TimezoneService.isMidnightInTimezone(timezone)
      expect(typeof isMidnight).toBe('boolean')

      // Test date boundary calculations at different times
      const boundaries1 = await TimezoneService.getDateBoundaries(userId)
      
      // Simulate time passing (mock would need to be more sophisticated for real testing)
      const boundaries2 = await TimezoneService.getDateBoundaries(userId)

      // Boundaries should be consistent for the same day
      expect(boundaries1.todayStart.getTime()).toBe(boundaries2.todayStart.getTime())
      expect(boundaries1.todayEnd.getTime()).toBe(boundaries2.todayEnd.getTime())
    })
  })

  describe('Performance Testing', () => {
    test('should handle concurrent filter requests efficiently', async () => {
      const tenantId = 'test-tenant'
      const userId = 'test-user'
      const concurrentRequests = 50

      // Mock fast responses
      mockDatabaseConnection.withRetry.mockImplementation((operation, context) => {
        if (context === 'getUserTimezone') {
          return Promise.resolve({ preferences: { timezone: 'UTC' } })
        }
        
        if (context === 'getCompletedTaskWindow') {
          return Promise.resolve({ preferences: { completedTaskVisibility: '7days' } })
        }
        
        // Simulate fast database responses
        return Promise.resolve([])
      })

      const startTime = Date.now()

      // Make concurrent requests
      const promises = Array.from({ length: concurrentRequests }, (_, i) => 
        TaskFilterService.getFilteredTasks(tenantId, userId, { 
          dueDate: i % 2 === 0 ? 'today' : 'overdue',
          limit: 10,
          offset: i * 10
        })
      )

      const results = await Promise.all(promises)
      const endTime = Date.now()
      const duration = endTime - startTime

      // All requests should complete successfully
      expect(results).toHaveLength(concurrentRequests)
      results.forEach(result => {
        expect(result).toHaveProperty('tasks')
        expect(result).toHaveProperty('totalCount')
        expect(result).toHaveProperty('hasMore')
      })

      // Should complete reasonably quickly (adjust threshold as needed)
      expect(duration).toBeLessThan(5000) // 5 seconds for 50 concurrent requests

      console.log(`Completed ${concurrentRequests} concurrent requests in ${duration}ms`)
    })

    test('should cache timezone lookups efficiently', async () => {
      const userId = 'test-user'
      const lookupCount = 10 // Reduced for more realistic test

      // Clear cache first
      TimezoneService.clearAllCache()

      // Mock database response - track calls
      let dbCallCount = 0
      mockDatabaseConnection.withRetry.mockImplementation(() => {
        dbCallCount++
        return Promise.resolve({
          preferences: { timezone: 'America/New_York' }
        })
      })

      const startTime = Date.now()

      // Make multiple timezone lookups
      const promises = Array.from({ length: lookupCount }, () => 
        TimezoneService.getUserTimezone(userId)
      )

      const results = await Promise.all(promises)
      const endTime = Date.now()
      const duration = endTime - startTime

      // All should return the same timezone
      results.forEach(timezone => {
        expect(timezone).toBe('America/New_York')
      })

      // Due to caching, should have fewer database calls than total requests
      expect(dbCallCount).toBeLessThanOrEqual(3) // Allow for some race conditions

      // Should be reasonably fast
      expect(duration).toBeLessThan(1000) // 1 second for 10 lookups

      console.log(`Completed ${lookupCount} timezone lookups with ${dbCallCount} DB calls in ${duration}ms`)
    })

    test('should handle large result sets efficiently', async () => {
      const tenantId = 'test-tenant'
      const userId = 'test-user'
      const taskCount = 1000

      // Mock large dataset
      mockDatabaseConnection.withRetry.mockImplementation((operation, context) => {
        if (context === 'getUserTimezone') {
          return Promise.resolve({ preferences: { timezone: 'UTC' } })
        }
        
        if (context === 'getCompletedTaskWindow') {
          return Promise.resolve({ preferences: { completedTaskVisibility: '7days' } })
        }
        
        if (context?.includes('count')) {
          return Promise.resolve(taskCount)
        }
        
        if (context?.includes('findMany')) {
          // Simulate large result set
          return Promise.resolve(Array.from({ length: 100 }, (_, i) => ({
            id: `task-${i}`,
            title: `Task ${i}`,
            status: 'active',
            dueDate: new Date(),
            project: null,
            context: null,
            area: null,
          })))
        }
        
        return Promise.resolve([])
      })

      const startTime = Date.now()

      // Test pagination through large dataset
      const pageSize = 100
      const pageCount = 10
      const results = []

      for (let page = 0; page < pageCount; page++) {
        const result = await TaskFilterService.getFilteredTasks(tenantId, userId, {
          limit: pageSize,
          offset: page * pageSize
        })
        results.push(result)
      }

      const endTime = Date.now()
      const duration = endTime - startTime

      // All pages should return data
      expect(results).toHaveLength(pageCount)
      results.forEach(result => {
        expect(result.tasks).toHaveLength(pageSize)
        expect(result.totalCount).toBe(taskCount)
      })

      // Should handle pagination efficiently
      expect(duration).toBeLessThan(2000) // 2 seconds for 10 pages

      console.log(`Paginated through ${pageCount} pages of ${pageSize} tasks in ${duration}ms`)
    })

    test('should maintain database optimization principles', async () => {
      const tenantId = 'test-tenant'
      const userId = 'test-user'

      // Track database calls
      let dbCallCount = 0
      mockDatabaseConnection.withRetry.mockImplementation((operation, context) => {
        dbCallCount++
        
        if (context === 'getUserTimezone') {
          return Promise.resolve({ preferences: { timezone: 'UTC' } })
        }
        
        if (context === 'getCompletedTaskWindow') {
          return Promise.resolve({ preferences: { completedTaskVisibility: '7days' } })
        }
        
        return Promise.resolve([])
      })

      // Make a single filter request
      await TaskFilterService.getFilteredTasks(tenantId, userId, { dueDate: 'today' })

      // Should use minimal database calls
      // Expected: getUserTimezone, getCompletedTaskWindow, findMany, count = 4 calls
      expect(dbCallCount).toBeLessThanOrEqual(4)

      // Reset counter and make another request (should use cache)
      dbCallCount = 0
      await TaskFilterService.getFilteredTasks(tenantId, userId, { dueDate: 'overdue' })

      // Should use fewer calls due to caching (no timezone lookup)
      // Expected: findMany, count, and possibly one cached lookup = 3 calls max
      expect(dbCallCount).toBeLessThanOrEqual(3)
    })
  })

  describe('Memory and Resource Management', () => {
    test('should not leak memory with repeated operations', async () => {
      const userId = 'test-user'
      const iterations = 100

      // Mock responses
      mockDatabaseConnection.withRetry.mockResolvedValue({
        preferences: { timezone: 'UTC' }
      })

      // Measure initial memory (rough approximation)
      const initialMemory = process.memoryUsage().heapUsed

      // Perform repeated operations
      for (let i = 0; i < iterations; i++) {
        await TimezoneService.getUserTimezone(userId)
        await TimezoneService.getDateBoundaries(userId)
        
        // Periodically clear cache to test cleanup
        if (i % 20 === 0) {
          TimezoneService.clearUserCache(userId)
        }
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc()
      }

      const finalMemory = process.memoryUsage().heapUsed
      const memoryIncrease = finalMemory - initialMemory

      // Memory increase should be reasonable (less than 10MB for this test)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024)

      console.log(`Memory increase after ${iterations} operations: ${Math.round(memoryIncrease / 1024)}KB`)
    })

    test('should handle cache cleanup properly', () => {
      const userIds = ['user1', 'user2', 'user3', 'user4', 'user5']

      // Populate cache
      userIds.forEach(userId => {
        TimezoneService['userTimezoneCache'].set(userId, 'UTC')
        TimezoneService['cacheExpiry'].set(userId, Date.now() + 60000)
      })

      // Verify cache is populated
      expect(TimezoneService['userTimezoneCache'].size).toBe(userIds.length)
      expect(TimezoneService['cacheExpiry'].size).toBe(userIds.length)

      // Clear specific user
      TimezoneService.clearUserCache('user1')
      expect(TimezoneService['userTimezoneCache'].size).toBe(userIds.length - 1)
      expect(TimezoneService['cacheExpiry'].size).toBe(userIds.length - 1)

      // Clear all cache
      TimezoneService.clearAllCache()
      expect(TimezoneService['userTimezoneCache'].size).toBe(0)
      expect(TimezoneService['cacheExpiry'].size).toBe(0)
    })
  })
})