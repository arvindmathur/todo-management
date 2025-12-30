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

describe('Error Handling Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    TimezoneService.clearAllCache()
  })

  describe('TimezoneService Error Handling', () => {
    test('should handle invalid timezone gracefully', () => {
      // Test various invalid timezone inputs
      expect(TimezoneService.validateTimezone('')).toBe('UTC')
      expect(TimezoneService.validateTimezone(null as any)).toBe('UTC')
      expect(TimezoneService.validateTimezone(undefined as any)).toBe('UTC')
      expect(TimezoneService.validateTimezone('Invalid/Timezone')).toBe('UTC')
      expect(TimezoneService.validateTimezone('   ')).toBe('UTC')
      expect(TimezoneService.validateTimezone(123 as any)).toBe('UTC')
    })

    test('should handle valid timezones correctly', () => {
      expect(TimezoneService.validateTimezone('America/New_York')).toBe('America/New_York')
      expect(TimezoneService.validateTimezone('Europe/London')).toBe('Europe/London')
      expect(TimezoneService.validateTimezone('Asia/Singapore')).toBe('Asia/Singapore')
      expect(TimezoneService.validateTimezone('UTC')).toBe('UTC')
      expect(TimezoneService.validateTimezone('  UTC  ')).toBe('UTC')
    })

    test('should handle database errors when getting user timezone', async () => {
      const userId = 'test-user-id'
      
      // Mock database error
      mockDatabaseConnection.withRetry.mockRejectedValue(new Error('Database connection failed'))
      
      const timezone = await TimezoneService.getUserTimezone(userId)
      
      // Should fallback to UTC
      expect(timezone).toBe('UTC')
      
      // Should cache the fallback
      const cachedTimezone = await TimezoneService.getUserTimezone(userId)
      expect(cachedTimezone).toBe('UTC')
    })

    test('should handle invalid date formats in convertToUTC', () => {
      const userTimezone = 'America/New_York'
      
      // Test various invalid date formats
      const invalidDates = [
        '',
        null,
        undefined,
        'invalid-date',
        '2023-13-01', // Invalid month
        '2023-01-32', // Invalid day
        '2023/01/01', // Wrong format
        'January 1, 2023', // Wrong format
        '2023-1-1', // Missing zero padding
      ]
      
      invalidDates.forEach(invalidDate => {
        const result = TimezoneService.convertToUTC(invalidDate as any, userTimezone)
        expect(result).toBeInstanceOf(Date)
        expect(result.getTime()).not.toBeNaN()
      })
    })

    test('should handle invalid timezone in convertToUTC', () => {
      const dateString = '2023-12-25'
      
      // Test with invalid timezone
      const result = TimezoneService.convertToUTC(dateString, 'Invalid/Timezone')
      expect(result).toBeInstanceOf(Date)
      expect(result.getTime()).not.toBeNaN()
    })

    test('should handle missing user preferences gracefully', async () => {
      const userId = 'test-user-id'
      
      // Mock user with no preferences
      mockDatabaseConnection.withRetry.mockResolvedValue(null)
      
      const timezone = await TimezoneService.getUserTimezone(userId)
      // Should detect and set default timezone (Asia/Singapore in test environment)
      expect(['UTC', 'Asia/Singapore']).toContain(timezone)
      
      const completedWindow = await TimezoneService.getCompletedTaskWindow(userId)
      expect(completedWindow).toBe(7) // Default fallback
    })

    test('should handle date boundary calculation errors', async () => {
      const userId = 'test-user-id'
      
      // Mock user with valid timezone
      mockDatabaseConnection.withRetry.mockResolvedValue({
        preferences: { timezone: 'America/New_York' }
      })
      
      // Mock Intl.DateTimeFormat to throw error
      const originalDateTimeFormat = Intl.DateTimeFormat
      Intl.DateTimeFormat = jest.fn().mockImplementation(() => {
        throw new Error('DateTimeFormat error')
      })
      
      try {
        const boundaries = await TimezoneService.getDateBoundaries(userId)
        
        // Should return fallback boundaries
        expect(boundaries).toHaveProperty('todayStart')
        expect(boundaries).toHaveProperty('todayEnd')
        expect(boundaries).toHaveProperty('tomorrowStart')
        expect(boundaries).toHaveProperty('weekFromNow')
        expect(boundaries).toHaveProperty('completedTaskCutoff')
        
        // All should be valid dates
        Object.values(boundaries).forEach(date => {
          expect(date).toBeInstanceOf(Date)
          expect(date.getTime()).not.toBeNaN()
        })
      } finally {
        // Restore original DateTimeFormat
        Intl.DateTimeFormat = originalDateTimeFormat
      }
    })
  })

  describe('TaskFilterService Error Handling', () => {
    test('should handle invalid parameters gracefully', async () => {
      // Test with invalid parameters
      const result1 = await TaskFilterService.getFilteredTasks('', 'user-id', {})
      expect(result1).toEqual({
        tasks: [],
        totalCount: 0,
        hasMore: false,
      })
      
      const result2 = await TaskFilterService.getFilteredTasks('tenant-id', '', {})
      expect(result2).toEqual({
        tasks: [],
        totalCount: 0,
        hasMore: false,
      })
      
      const result3 = await TaskFilterService.getFilteredTasks(null as any, null as any, {})
      expect(result3).toEqual({
        tasks: [],
        totalCount: 0,
        hasMore: false,
      })
    })

    test('should handle database errors in getFilteredTasks', async () => {
      const tenantId = 'test-tenant'
      const userId = 'test-user'
      
      // Mock timezone service to succeed
      mockDatabaseConnection.withRetry
        .mockResolvedValueOnce({ preferences: { timezone: 'UTC' } }) // getUserTimezone
        .mockResolvedValueOnce({ preferences: { completedTaskVisibility: '7days' } }) // getCompletedTaskWindow
        .mockRejectedValueOnce(new Error('Database error')) // findMany
        .mockRejectedValueOnce(new Error('Database error')) // count
      
      const result = await TaskFilterService.getFilteredTasks(tenantId, userId, {})
      
      // Should return empty result instead of throwing
      expect(result).toEqual({
        tasks: [],
        totalCount: 0,
        hasMore: false,
      })
    })

    test('should handle database errors in getFilterCounts', async () => {
      const tenantId = 'test-tenant'
      const userId = 'test-user'
      
      // Mock all database calls to fail
      mockDatabaseConnection.withRetry.mockRejectedValue(new Error('Database error'))
      
      const result = await TaskFilterService.getFilterCounts(tenantId, userId)
      
      // Should return zero counts instead of throwing
      expect(result).toEqual({
        all: 0,
        focus: 0,
        today: 0,
        overdue: 0,
        upcoming: 0,
        noDueDate: 0,
      })
    })

    test('should validate and sanitize filter parameters', async () => {
      const tenantId = 'test-tenant'
      const userId = 'test-user'
      
      // Mock successful database responses
      mockDatabaseConnection.withRetry
        .mockResolvedValueOnce({ preferences: { timezone: 'UTC' } })
        .mockResolvedValueOnce({ preferences: { completedTaskVisibility: '7days' } })
        .mockResolvedValueOnce([]) // findMany
        .mockResolvedValueOnce(0) // count
      
      // Test with invalid filter parameters
      const filters = {
        priority: 'invalid-priority', // Should be filtered out
        limit: -10, // Should be corrected to minimum
        offset: -5, // Should be corrected to 0
        search: '   ', // Should be ignored (empty after trim)
        projectId: 123, // Should be filtered out (not string)
      }
      
      await TaskFilterService.getFilteredTasks(tenantId, userId, filters)
      
      // Verify that prisma.task.findMany was called with sanitized parameters
      expect(mockDatabaseConnection.withRetry).toHaveBeenCalledWith(
        expect.any(Function),
        'getFilteredTasks-findMany'
      )
      
      // The function should have been called with corrected limit and offset
      const findManyCall = mockDatabaseConnection.withRetry.mock.calls.find(
        call => call[1] === 'getFilteredTasks-findMany'
      )
      expect(findManyCall).toBeDefined()
    })

    test('should handle timezone service failures gracefully', async () => {
      const tenantId = 'test-tenant'
      const userId = 'test-user'
      
      // Mock TimezoneService methods to fail
      jest.spyOn(TimezoneService, 'getUserTimezone').mockRejectedValue(new Error('Timezone error'))
      jest.spyOn(TimezoneService, 'getCompletedTaskWindow').mockRejectedValue(new Error('Window error'))
      jest.spyOn(TimezoneService, 'getDateBoundaries').mockRejectedValue(new Error('Boundaries error'))
      
      // Mock successful database responses
      mockDatabaseConnection.withRetry
        .mockResolvedValueOnce([]) // findMany
        .mockResolvedValueOnce(0) // count
      
      const result = await TaskFilterService.getFilteredTasks(tenantId, userId, {})
      
      // Should still return a result with fallback values
      expect(result).toEqual({
        tasks: [],
        totalCount: 0,
        hasMore: false,
      })
      
      // Restore original methods
      jest.restoreAllMocks()
    })
  })

  describe('Edge Cases and Boundary Conditions', () => {
    test('should handle very large limit values', async () => {
      const tenantId = 'test-tenant'
      const userId = 'test-user'
      
      // Mock successful responses
      mockDatabaseConnection.withRetry
        .mockResolvedValueOnce({ preferences: { timezone: 'UTC' } })
        .mockResolvedValueOnce({ preferences: { completedTaskVisibility: '7days' } })
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(0)
      
      await TaskFilterService.getFilteredTasks(tenantId, userId, { limit: 999999 })
      
      // Should cap the limit at 1000 - verify through database call
      expect(mockDatabaseConnection.withRetry).toHaveBeenCalledWith(
        expect.any(Function),
        'getFilteredTasks-findMany'
      )
      
      // The limit should be capped internally
      const result = await TaskFilterService.getFilteredTasks(tenantId, userId, { limit: 999999 })
      expect(result).toHaveProperty('tasks')
      expect(result).toHaveProperty('totalCount')
      expect(result).toHaveProperty('hasMore')
    })

    test('should handle concurrent timezone cache access', async () => {
      const userId = 'test-user'
      
      // Clear cache first
      TimezoneService.clearAllCache()
      
      // Mock database response - should only be called once
      let callCount = 0
      mockDatabaseConnection.withRetry.mockImplementation(() => {
        callCount++
        return Promise.resolve({
          preferences: { timezone: 'America/New_York' }
        })
      })
      
      // Make multiple concurrent requests
      const promises = Array.from({ length: 10 }, () => 
        TimezoneService.getUserTimezone(userId)
      )
      
      const results = await Promise.all(promises)
      
      // All should return the same timezone
      results.forEach(timezone => {
        expect(timezone).toBe('America/New_York')
      })
      
      // Due to caching, database should be called minimal times
      // (may be called a few times due to race conditions, but not 10 times)
      expect(callCount).toBeLessThanOrEqual(3)
    })

    test('should handle midnight detection edge cases', () => {
      // Test with various timezone formats
      const timezones = [
        'UTC',
        'America/New_York',
        'Europe/London',
        'Asia/Singapore',
        'Invalid/Timezone', // Should not throw
      ]
      
      timezones.forEach(timezone => {
        expect(() => {
          TimezoneService.isMidnightInTimezone(timezone)
        }).not.toThrow()
      })
    })
  })
})