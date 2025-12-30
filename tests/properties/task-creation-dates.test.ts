import * as fc from 'fast-check'
import { TimezoneService } from '@/lib/timezone-service'

describe('Task Creation Date Property Tests', () => {
  beforeEach(() => {
    // Clear timezone cache before each test
    TimezoneService.clearAllCache()
  })

  /**
   * Feature: task-filtering-fixes, Property 7: UTC Storage with Timezone Interpretation
   * For any date input in YYYY-MM-DD format and user timezone, the date should be 
   * stored in UTC but interpreted correctly in the user's timezone for filtering
   */
  test('Property 7: Task Creation Date Conversion', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2020, max: 2030 }),
        fc.integer({ min: 1, max: 12 }),
        fc.integer({ min: 1, max: 28 }), // Use 28 to avoid month-end issues
        fc.constantFrom(
          'UTC',
          'America/New_York',
          'Europe/London', 
          'Asia/Tokyo',
          'Asia/Singapore',
          'Australia/Sydney',
          'America/Los_Angeles',
          'Europe/Paris'
        ),
        async (year, month, day, timezone) => {
          // Create YYYY-MM-DD string
          const dateString = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
          
          // Mock getUserTimezone to return our test timezone
          const originalGetUserTimezone = TimezoneService.getUserTimezone
          TimezoneService.getUserTimezone = jest.fn().mockResolvedValue(timezone)
          
          try {
            // Convert date using the same logic as task creation API
            const utcDate = TimezoneService.convertToUTC(dateString, timezone)
            
            // Verify the result is a valid Date
            expect(utcDate).toBeInstanceOf(Date)
            expect(isNaN(utcDate.getTime())).toBe(false)
            
            // Verify the date represents the same calendar date in the user's timezone
            const formatter = new Intl.DateTimeFormat('en-CA', {
              timeZone: timezone,
              year: 'numeric',
              month: '2-digit',
              day: '2-digit'
            })
            
            const resultDateString = formatter.format(utcDate)
            expect(resultDateString).toBe(dateString)
            
            // Verify it's stored in UTC (the time component will vary by timezone)
            expect(utcDate.getUTCFullYear()).toBeGreaterThanOrEqual(2020)
            expect(utcDate.getUTCFullYear()).toBeLessThanOrEqual(2030)
            
          } finally {
            // Restore original method
            TimezoneService.getUserTimezone = originalGetUserTimezone
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  test('Task creation handles invalid date formats gracefully', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string().filter(s => !/^\d{4}-\d{2}-\d{2}$/.test(s)), // Invalid date formats
        fc.constantFrom('UTC', 'America/New_York', 'Asia/Singapore'),
        async (invalidDateString, timezone) => {
          // Mock getUserTimezone
          const originalGetUserTimezone = TimezoneService.getUserTimezone
          TimezoneService.getUserTimezone = jest.fn().mockResolvedValue(timezone)
          
          try {
            // For invalid YYYY-MM-DD formats, the API should handle them as datetime strings
            // or throw appropriate errors
            const result = TimezoneService.convertToUTC(invalidDateString, timezone)
            
            // If it doesn't throw, it should return a valid date or handle gracefully
            if (result) {
              expect(result).toBeInstanceOf(Date)
              // Invalid dates should result in fallback behavior
            }
          } catch (error) {
            // Errors are acceptable for invalid formats
            expect(error).toBeDefined()
          } finally {
            TimezoneService.getUserTimezone = originalGetUserTimezone
          }
        }
      ),
      { numRuns: 50 }
    )
  })

  test('Date conversion is consistent across multiple calls', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2020, max: 2030 }),
        fc.integer({ min: 1, max: 12 }),
        fc.integer({ min: 1, max: 28 }),
        fc.constantFrom('UTC', 'America/New_York', 'Asia/Singapore'),
        async (year, month, day, timezone) => {
          const dateString = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
          
          // Mock getUserTimezone
          const originalGetUserTimezone = TimezoneService.getUserTimezone
          TimezoneService.getUserTimezone = jest.fn().mockResolvedValue(timezone)
          
          try {
            // Convert the same date multiple times
            const result1 = TimezoneService.convertToUTC(dateString, timezone)
            const result2 = TimezoneService.convertToUTC(dateString, timezone)
            const result3 = TimezoneService.convertToUTC(dateString, timezone)
            
            // All results should be identical
            expect(result1.getTime()).toBe(result2.getTime())
            expect(result2.getTime()).toBe(result3.getTime())
            
          } finally {
            TimezoneService.getUserTimezone = originalGetUserTimezone
          }
        }
      ),
      { numRuns: 50 }
    )
  })

  test('Timezone conversion preserves date boundaries', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('UTC', 'America/New_York', 'Europe/London', 'Asia/Tokyo', 'Asia/Singapore'),
        async (timezone) => {
          // Test with today's date
          const today = new Date()
          const formatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: timezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          })
          
          const todayString = formatter.format(today)
          
          // Mock getUserTimezone
          const originalGetUserTimezone = TimezoneService.getUserTimezone
          TimezoneService.getUserTimezone = jest.fn().mockResolvedValue(timezone)
          
          try {
            const utcDate = TimezoneService.convertToUTC(todayString, timezone)
            
            // The converted date should still represent the same day in the user's timezone
            const resultString = formatter.format(utcDate)
            expect(resultString).toBe(todayString)
            
            // The UTC date should be within 24 hours of the original date
            const timeDiff = Math.abs(utcDate.getTime() - today.getTime())
            expect(timeDiff).toBeLessThan(24 * 60 * 60 * 1000) // Less than 24 hours
            
          } finally {
            TimezoneService.getUserTimezone = originalGetUserTimezone
          }
        }
      ),
      { numRuns: 30 }
    )
  })

  test('Edge case: Leap year dates are handled correctly', async () => {
    const leapYears = [2020, 2024, 2028]
    
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...leapYears),
        fc.constantFrom('UTC', 'America/New_York', 'Europe/London', 'Asia/Singapore'),
        async (year, timezone) => {
          // Test February 29th in leap years
          const dateString = `${year}-02-29`
          
          // Mock getUserTimezone
          const originalGetUserTimezone = TimezoneService.getUserTimezone
          TimezoneService.getUserTimezone = jest.fn().mockResolvedValue(timezone)
          
          try {
            const utcDate = TimezoneService.convertToUTC(dateString, timezone)
            
            // Should successfully convert leap year dates
            expect(utcDate).toBeInstanceOf(Date)
            expect(isNaN(utcDate.getTime())).toBe(false)
            
            // Should preserve the date in the user's timezone
            const formatter = new Intl.DateTimeFormat('en-CA', {
              timeZone: timezone,
              year: 'numeric',
              month: '2-digit',
              day: '2-digit'
            })
            
            const resultString = formatter.format(utcDate)
            expect(resultString).toBe(dateString)
            
          } finally {
            TimezoneService.getUserTimezone = originalGetUserTimezone
          }
        }
      ),
      { numRuns: 20 }
    )
  })
})