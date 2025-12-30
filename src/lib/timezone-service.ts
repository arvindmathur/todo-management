import { DatabaseConnection } from "./db-connection"
import { prisma } from "./prisma"

export interface UserPreferences {
  timezone?: string
  completedTaskVisibility?: "none" | "1day" | "7days" | "30days"
  gtdEnabled?: boolean
  [key: string]: any
}

export interface DateBoundaries {
  todayStart: Date
  todayEnd: Date
  tomorrowStart: Date
  weekFromNow: Date
  completedTaskCutoff: Date
}

export class TimezoneService {
  private static userTimezoneCache = new Map<string, string>()
  private static cacheExpiry = new Map<string, number>()
  private static readonly CACHE_DURATION = 60 * 60 * 1000 // 1 hour

  /**
   * Get user's timezone preference with fallback to UTC
   */
  static async getUserTimezone(userId: string): Promise<string> {
    // Check cache first
    const cached = this.userTimezoneCache.get(userId)
    const expiry = this.cacheExpiry.get(userId)
    
    if (cached && expiry && Date.now() < expiry) {
      return cached
    }

    try {
      const user = await DatabaseConnection.withRetry(
        () => prisma.user.findUnique({
          where: { id: userId },
          select: { preferences: true }
        }),
        'getUserTimezone'
      )

      const preferences = (user?.preferences as UserPreferences) || {}
      let timezone = preferences.timezone

      // If no timezone is set, try to detect and set a default
      if (!timezone) {
        timezone = await this.detectAndSetDefaultTimezone(userId)
      }

      // Validate timezone
      const validTimezone = this.validateTimezone(timezone)

      // Cache the result
      this.userTimezoneCache.set(userId, validTimezone)
      this.cacheExpiry.set(userId, Date.now() + this.CACHE_DURATION)

      return validTimezone
    } catch (error) {
      console.error('Error getting user timezone:', error)
      
      // Enhanced fallback: try to use cached value even if expired
      const cachedFallback = this.userTimezoneCache.get(userId)
      if (cachedFallback) {
        console.warn(`Using expired cached timezone for user ${userId}: ${cachedFallback}`)
        return cachedFallback
      }
      
      // Final fallback to UTC
      const fallbackTimezone = 'UTC'
      console.warn(`Using final fallback timezone for user ${userId}: ${fallbackTimezone}`)
      
      // Cache the fallback to avoid repeated database calls
      this.userTimezoneCache.set(userId, fallbackTimezone)
      this.cacheExpiry.set(userId, Date.now() + this.CACHE_DURATION)
      
      return fallbackTimezone
    }
  }

  /**
   * Detect and set default timezone for user
   */
  private static async detectAndSetDefaultTimezone(userId: string): Promise<string> {
    try {
      // Use browser's detected timezone as default
      const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
      const validTimezone = this.validateTimezone(detectedTimezone)

      // Update user preferences with detected timezone (with error handling)
      try {
        await DatabaseConnection.withRetry(
          async () => {
            const user = await prisma.user.findUnique({
              where: { id: userId },
              select: { preferences: true }
            })

            const currentPreferences = (user?.preferences as any) || {}
            const updatedPreferences = {
              ...currentPreferences,
              timezone: validTimezone
            }

            return prisma.user.update({
              where: { id: userId },
              data: { preferences: updatedPreferences }
            })
          },
          'setDefaultTimezone'
        )
        
        console.log(`Set default timezone for user ${userId}: ${validTimezone}`)
      } catch (updateError) {
        console.warn(`Failed to update timezone preference for user ${userId}:`, updateError)
        // Continue with detected timezone even if update fails
      }

      return validTimezone
    } catch (error) {
      console.error('Error setting default timezone:', error)
      return 'UTC'
    }
  }

  /**
   * Validate timezone identifier and return valid timezone or UTC fallback
   */
  static validateTimezone(timezone: string): string {
    // Handle null, undefined, or empty strings
    if (!timezone || typeof timezone !== 'string' || timezone.trim().length === 0) {
      console.warn(`Invalid timezone input: "${timezone}", falling back to UTC`)
      return 'UTC'
    }

    try {
      // Test if timezone is valid by creating a date formatter
      new Intl.DateTimeFormat('en-US', { timeZone: timezone.trim() })
      return timezone.trim()
    } catch (error) {
      console.warn(`Invalid timezone "${timezone}", falling back to UTC`)
      return 'UTC'
    }
  }

  /**
   * Convert date from user timezone to UTC for storage
   */
  static convertToUTC(dateString: string, userTimezone: string): Date {
    // Input validation
    if (!dateString || typeof dateString !== 'string') {
      console.error('Invalid date string provided to convertToUTC:', dateString)
      return new Date() // Return current date as fallback
    }

    if (!userTimezone || typeof userTimezone !== 'string') {
      console.warn('Invalid timezone provided to convertToUTC, using UTC:', userTimezone)
      userTimezone = 'UTC'
    }

    try {
      // Parse YYYY-MM-DD format
      const dateMatch = dateString.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/)
      if (!dateMatch) {
        throw new Error(`Invalid date format: ${dateString}. Expected YYYY-MM-DD`)
      }

      const [, yearStr, monthStr, dayStr] = dateMatch
      const year = parseInt(yearStr, 10)
      const month = parseInt(monthStr, 10)
      const day = parseInt(dayStr, 10)
      
      if (!year || !month || !day || month < 1 || month > 12 || day < 1 || day > 31) {
        throw new Error(`Invalid date values: year=${year}, month=${month}, day=${day}`)
      }

      // Validate timezone before using it
      const validTimezone = this.validateTimezone(userTimezone)

      // Create a date string that represents midnight in the user's timezone
      const dateTimeString = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}T00:00:00`
      
      // Parse this as if it were in the user's timezone
      const localDate = new Date(dateTimeString)
      
      // Validate the created date
      if (isNaN(localDate.getTime())) {
        throw new Error(`Failed to create valid date from: ${dateTimeString}`)
      }
      
      // Get what this date would be in the user's timezone
      const userTzDate = new Date(localDate.toLocaleString('sv-SE', { timeZone: validTimezone }))
      const utcDate = new Date(localDate.toLocaleString('sv-SE', { timeZone: 'UTC' }))
      
      // Calculate the offset and adjust
      const offset = userTzDate.getTime() - utcDate.getTime()
      const result = new Date(localDate.getTime() - offset)
      
      // Validate the result
      if (isNaN(result.getTime())) {
        throw new Error('Timezone conversion resulted in invalid date')
      }
      
      return result
    } catch (error) {
      console.error('Error converting date to UTC:', error)
      console.error('Input values:', { dateString, userTimezone })
      
      // Enhanced fallback: try to parse as ISO date first
      try {
        const fallbackDate = new Date(dateString)
        if (!isNaN(fallbackDate.getTime())) {
          console.warn('Using fallback date parsing for:', dateString)
          return fallbackDate
        }
      } catch (fallbackError) {
        console.error('Fallback date parsing also failed:', fallbackError)
      }
      
      // Final fallback: create date in UTC
      try {
        const [year, month, day] = dateString.split('-').map(Number)
        if (year && month && day) {
          const utcFallback = new Date(Date.UTC(year, month - 1, day))
          console.warn('Using UTC fallback date:', utcFallback.toISOString())
          return utcFallback
        }
      } catch (utcFallbackError) {
        console.error('UTC fallback also failed:', utcFallbackError)
      }
      
      // Absolute final fallback: current date
      const currentDate = new Date()
      console.error('Using current date as absolute fallback:', currentDate.toISOString())
      return currentDate
    }
  }

  /**
   * Get current date in user's timezone
   */
  static getCurrentDateInTimezone(userTimezone: string): Date {
    try {
      const now = new Date()
      
      // Get current date in user's timezone
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: userTimezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      })
      
      const dateString = formatter.format(now)
      const [year, month, day] = dateString.split('-').map(Number)
      
      // Return date object representing start of day in user's timezone
      return new Date(year, month - 1, day)
    } catch (error) {
      console.error('Error getting current date in timezone:', error)
      // Fallback to UTC
      const now = new Date()
      return new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    }
  }

  /**
   * Calculate date boundaries for filtering in user's timezone
   */
  static async getDateBoundaries(
    userId: string, 
    completedTaskWindow: number = 7
  ): Promise<DateBoundaries> {
    const userTimezone = await this.getUserTimezone(userId)
    
    try {
      const now = new Date()
      
      // Get current date components in user's timezone
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: userTimezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      })
      
      const todayString = formatter.format(now)
      const [year, month, day] = todayString.split('-').map(Number)
      
      // Calculate boundaries in user's timezone, then convert to UTC
      const todayInUserTz = new Date(year, month - 1, day)
      const tomorrowInUserTz = new Date(year, month - 1, day + 1)
      const weekFromNowInUserTz = new Date(year, month - 1, day + 7)
      const completedCutoffInUserTz = new Date(year, month - 1, day - completedTaskWindow)
      
      // Convert to UTC for database queries
      const todayStart = this.convertLocalToUTC(todayInUserTz, userTimezone)
      const todayEnd = this.convertLocalToUTC(tomorrowInUserTz, userTimezone)
      const tomorrowStart = todayEnd
      const weekFromNow = this.convertLocalToUTC(weekFromNowInUserTz, userTimezone)
      const completedTaskCutoff = this.convertLocalToUTC(completedCutoffInUserTz, userTimezone)
      
      return {
        todayStart,
        todayEnd,
        tomorrowStart,
        weekFromNow,
        completedTaskCutoff
      }
    } catch (error) {
      console.error('Error calculating date boundaries:', error)
      
      // Fallback to UTC calculations
      const now = new Date()
      const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
      const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)
      const tomorrowStart = todayEnd
      const weekFromNow = new Date(todayStart.getTime() + 7 * 24 * 60 * 60 * 1000)
      const completedTaskCutoff = new Date(todayStart.getTime() - completedTaskWindow * 24 * 60 * 60 * 1000)
      
      return {
        todayStart,
        todayEnd,
        tomorrowStart,
        weekFromNow,
        completedTaskCutoff
      }
    }
  }

  /**
   * Convert local date to UTC accounting for timezone
   */
  private static convertLocalToUTC(localDate: Date, timezone: string): Date {
    try {
      // Get the date string in the target timezone
      const dateString = localDate.toISOString().split('T')[0] + 'T00:00:00'
      
      // Create date object and adjust for timezone
      const date = new Date(dateString)
      const utcTime = date.getTime() + (date.getTimezoneOffset() * 60000)
      
      // Get timezone offset for the specific date
      const tempDate = new Date(utcTime)
      const targetTime = new Date(tempDate.toLocaleString('en-US', { timeZone: timezone }))
      const timezoneOffset = utcTime - targetTime.getTime()
      
      return new Date(utcTime + timezoneOffset)
    } catch (error) {
      console.error('Error converting local to UTC:', error)
      return localDate // Fallback to original date
    }
  }

  /**
   * Check if it's midnight in user's timezone (for real-time updates)
   */
  static isMidnightInTimezone(userTimezone: string): boolean {
    try {
      const now = new Date()
      
      // Get current time components in user's timezone
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: userTimezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      })
      
      const timeString = formatter.format(now)
      const [hour, minute] = timeString.split(':').map(Number)
      
      // Check if it's within 1 minute of midnight
      return hour === 0 && minute === 0
    } catch (error) {
      console.error('Error checking midnight in timezone:', error)
      return false
    }
  }

  /**
   * Get user's completed task visibility preference
   */
  static async getCompletedTaskWindow(userId: string): Promise<number> {
    try {
      const user = await DatabaseConnection.withRetry(
        () => prisma.user.findUnique({
          where: { id: userId },
          select: { preferences: true }
        }),
        'getCompletedTaskWindow'
      )

      const preferences = (user?.preferences as UserPreferences) || {}
      const visibility = preferences.completedTaskVisibility || "7days"
      
      // Convert string values to numbers
      switch (visibility) {
        case "none":
          return 0
        case "1day":
          return 1
        case "7days":
          return 7
        case "30days":
          return 30
        default:
          return 7 // Default fallback
      }
    } catch (error) {
      console.error('Error getting completed task window:', error)
      return 7 // Default fallback
    }
  }

  /**
   * Clear cache for a specific user (useful when preferences change)
   */
  static clearUserCache(userId: string): void {
    this.userTimezoneCache.delete(userId)
    this.cacheExpiry.delete(userId)
  }

  /**
   * Clear all cached data (useful for testing or memory management)
   */
  static clearAllCache(): void {
    this.userTimezoneCache.clear()
    this.cacheExpiry.clear()
  }
}