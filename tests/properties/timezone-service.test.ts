import * as fc from 'fast-check'
import { TimezoneService } from '@/lib/timezone-service'

describe('TimezoneService Property Tests', () => {
  beforeEach(() => {
    // Clear cache before each test
    TimezoneService.clearAllCache()
  })

  /**
   * Feature: task-filtering-fixes, Property 1: Timezone-aware Today Calculation
   * For any user timezone and current timestamp, calculating "today" should return 
   * the correct date in that user's timezone, not the server timezone
   */
  test('Property 1: Timezone-aware Today Calculation', async () => {
    await fc.assert(
      fc.asyncProperty(
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
        async (timezone) => {
          // Get current date in the specified timezone
          const currentDate = TimezoneService.getCurrentDateInTimezone(timezone)
          
          // Verify the date is valid
          expect(currentDate).toBeInstanceOf(Date)
          expect(isNaN(currentDate.getTime())).toBe(false)
          
          // The date should represent start of day (00:00:00)
          expect(currentDate.getHours()).toBe(0)
          expect(currentDate.getMinutes()).toBe(0)
          expect(currentDate.getSeconds()).toBe(0)
          expect(currentDate.getMilliseconds()).toBe(0)
          
          // Verify it's actually today in that timezone
          const now = new Date()
          const formatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: timezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          })
          
          const expectedDateString = formatter.format(now)
          const actualDateString = formatter.format(currentDate)
          
          expect(actualDateString).toBe(expectedDateString)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Feature: task-filtering-fixes, Property 7: UTC Storage with Timezone Interpretation
   * For any date input in YYYY-MM-DD format and user timezone, the date should be 
   * stored in UTC but interpreted correctly in the user's timezone for filtering
   */
  test('Property 7: UTC Storage with Timezone Interpretation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
        fc.constantFrom(
          'UTC',
          'America/New_York',
          'Europe/London', 
          'Asia/Tokyo',
          'Asia/Singapore',
          'Australia/Sydney',
          'America/Los_Angeles'
        ),
        async (inputDate, timezone) => {
          // Format date as YYYY-MM-DD string
          const dateString = inputDate.toISOString().split('T')[0]
          
          // Convert to UTC using timezone service
          const utcDate = TimezoneService.convertToUTC(dateString, timezone)
          
          // Verify the result is a valid Date in UTC
          expect(utcDate).toBeInstanceOf(Date)
          expect(isNaN(utcDate.getTime())).toBe(false)
          
          // The UTC date should represent the same calendar date when viewed in the user's timezone
          const formatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: timezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          })
          
          const resultDateString = formatter.format(utcDate)
          expect(resultDateString).toBe(dateString)
          
          // Verify it's stored as start of day in UTC context
          // (The exact UTC time will vary by timezone, but should be consistent)
          const utcHours = utcDate.getUTCHours()
          expect(utcHours).toBeGreaterThanOrEqual(0)
          expect(utcHours).toBeLessThan(24)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Additional Property Test: Date Conversion Round Trip
   * For any valid date string and timezone, converting to UTC and back should preserve the original date
   */
  test('Property 7 Extended: Date Conversion Round Trip', async () => {
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
          'Australia/Sydney'
        ),
        async (year, month, day, timezone) => {
          // Create YYYY-MM-DD string
          const dateString = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
          
          // Convert to UTC
          const utcDate = TimezoneService.convertToUTC(dateString, timezone)
          
          // Convert back to date string in the same timezone
          const formatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: timezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          })
          
          const roundTripDateString = formatter.format(utcDate)
          
          // Should get back the original date string
          expect(roundTripDateString).toBe(dateString)
        }
      ),
      { numRuns: 100 }
    )
  })

  test('Timezone validation handles invalid timezones', () => {
    fc.assert(
      fc.property(
        fc.string(),
        (invalidTimezone) => {
          const result = TimezoneService.validateTimezone(invalidTimezone)
          
          // Should either return the original timezone (if valid) or 'UTC' (if invalid)
          expect(typeof result).toBe('string')
          
          // The result should always be a valid timezone
          expect(() => {
            new Intl.DateTimeFormat('en-US', { timeZone: result })
          }).not.toThrow()
        }
      ),
      { numRuns: 50 }
    )
  })

  test('Date boundaries are calculated correctly for any timezone', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          'UTC',
          'America/New_York',
          'Europe/London', 
          'Asia/Tokyo',
          'Asia/Singapore'
        ),
        fc.integer({ min: 1, max: 30 }),
        async (timezone, completedWindow) => {
          // Mock user ID for testing
          const mockUserId = 'test-user-id'
          
          // Mock the getUserTimezone method to return our test timezone
          const originalGetUserTimezone = TimezoneService.getUserTimezone
          TimezoneService.getUserTimezone = jest.fn().mockResolvedValue(timezone)
          
          try {
            const boundaries = await TimezoneService.getDateBoundaries(mockUserId, completedWindow)
            
            // Verify all boundaries are valid dates
            expect(boundaries.todayStart).toBeInstanceOf(Date)
            expect(boundaries.todayEnd).toBeInstanceOf(Date)
            expect(boundaries.tomorrowStart).toBeInstanceOf(Date)
            expect(boundaries.weekFromNow).toBeInstanceOf(Date)
            expect(boundaries.completedTaskCutoff).toBeInstanceOf(Date)
            
            // Verify logical relationships
            expect(boundaries.todayStart.getTime()).toBeLessThan(boundaries.todayEnd.getTime())
            expect(boundaries.todayEnd.getTime()).toBe(boundaries.tomorrowStart.getTime())
            expect(boundaries.tomorrowStart.getTime()).toBeLessThan(boundaries.weekFromNow.getTime())
            expect(boundaries.completedTaskCutoff.getTime()).toBeLessThan(boundaries.todayStart.getTime())
            
            // Verify the time differences are correct
            const oneDayMs = 24 * 60 * 60 * 1000
            const todayDuration = boundaries.todayEnd.getTime() - boundaries.todayStart.getTime()
            expect(Math.abs(todayDuration - oneDayMs)).toBeLessThan(60 * 60 * 1000) // Within 1 hour (for DST)
            
            const weekDuration = boundaries.weekFromNow.getTime() - boundaries.tomorrowStart.getTime()
            expect(Math.abs(weekDuration - (6 * oneDayMs))).toBeLessThan(6 * 60 * 60 * 1000) // Within 6 hours (for DST)
            
          } finally {
            // Restore original method
            TimezoneService.getUserTimezone = originalGetUserTimezone
          }
        }
      ),
      { numRuns: 50 }
    )
  })

  test('Midnight detection works correctly', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          'UTC',
          'America/New_York',
          'Europe/London', 
          'Asia/Tokyo',
          'Asia/Singapore'
        ),
        (timezone) => {
          const isMidnight = TimezoneService.isMidnightInTimezone(timezone)
          
          // Should return a boolean
          expect(typeof isMidnight).toBe('boolean')
          
          // If it's midnight, verify by checking current time in that timezone
          if (isMidnight) {
            const now = new Date()
            const formatter = new Intl.DateTimeFormat('en-US', {
              timeZone: timezone,
              hour: '2-digit',
              minute: '2-digit',
              hour12: false
            })
            
            const timeString = formatter.format(now)
            const [hour, minute] = timeString.split(':').map(Number)
            
            // Should be within 1 minute of midnight
            expect(hour).toBe(0)
            expect(minute).toBeLessThanOrEqual(1)
          }
        }
      ),
      { numRuns: 20 } // Fewer runs since this depends on actual current time
    )
  })
})