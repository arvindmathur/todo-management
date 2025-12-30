import { TimezoneService } from './timezone-service'
import { TaskFilterService } from './task-filter-service'

export interface MidnightUpdateEvent {
  userId: string
  userTimezone: string
  timestamp: Date
  affectedFilters: string[]
}

export class RealtimeUpdateService {
  private static midnightTimers = new Map<string, NodeJS.Timeout>()
  private static userTimezones = new Map<string, string>()
  
  /**
   * Schedule midnight updates for a user in their timezone
   */
  static async scheduleMidnightUpdates(userId: string): Promise<void> {
    try {
      // Get user's timezone
      const userTimezone = await TimezoneService.getUserTimezone(userId)
      this.userTimezones.set(userId, userTimezone)
      
      // Clear any existing timer for this user
      this.clearMidnightTimer(userId)
      
      // Calculate time until next midnight in user's timezone
      const msUntilMidnight = this.calculateTimeUntilMidnight(userTimezone)
      
      // Schedule the midnight update
      const timer = setTimeout(async () => {
        await this.handleMidnightUpdate(userId, userTimezone)
        // Reschedule for the next day
        await this.scheduleMidnightUpdates(userId)
      }, msUntilMidnight)
      
      this.midnightTimers.set(userId, timer)
      
      console.log(`Scheduled midnight update for user ${userId} in ${userTimezone} (${msUntilMidnight}ms from now)`)
    } catch (error) {
      console.error(`Error scheduling midnight updates for user ${userId}:`, error)
    }
  }
  
  /**
   * Handle midnight update for a user
   */
  private static async handleMidnightUpdate(userId: string, userTimezone: string): Promise<void> {
    try {
      console.log(`Processing midnight update for user ${userId} in timezone ${userTimezone}`)
      
      // Clear timezone cache to force refresh with new date boundaries
      TimezoneService.clearUserCache(userId)
      
      // Refresh filter cache
      await TaskFilterService.refreshFiltersForTimezone(userTimezone)
      
      // Create midnight update event
      const event: MidnightUpdateEvent = {
        userId,
        userTimezone,
        timestamp: new Date(),
        affectedFilters: ['today', 'overdue', 'upcoming', 'focus']
      }
      
      // Emit event for real-time updates (if using WebSockets or Server-Sent Events)
      await this.emitMidnightUpdate(event)
      
      console.log(`Completed midnight update for user ${userId}`)
    } catch (error) {
      console.error(`Error handling midnight update for user ${userId}:`, error)
    }
  }
  
  /**
   * Calculate milliseconds until next midnight in a timezone
   */
  private static calculateTimeUntilMidnight(timezone: string): number {
    try {
      const now = new Date()
      
      // Get current time in the target timezone
      const nowInTz = new Date(now.toLocaleString('en-US', { timeZone: timezone }))
      
      // Calculate next midnight in the timezone
      const nextMidnight = new Date(nowInTz)
      nextMidnight.setHours(24, 0, 0, 0) // Set to next midnight
      
      // Convert back to local time for setTimeout
      const nextMidnightLocal = new Date(nextMidnight.toLocaleString('en-US', { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }))
      
      const msUntilMidnight = nextMidnightLocal.getTime() - now.getTime()
      
      // Ensure we don't schedule negative time or more than 24 hours
      return Math.max(1000, Math.min(msUntilMidnight, 24 * 60 * 60 * 1000))
    } catch (error) {
      console.error('Error calculating time until midnight:', error)
      // Fallback: check again in 1 hour
      return 60 * 60 * 1000
    }
  }
  
  /**
   * Check if it's currently midnight in a user's timezone
   */
  static async isMidnightForUser(userId: string): Promise<boolean> {
    try {
      const userTimezone = await TimezoneService.getUserTimezone(userId)
      return TimezoneService.isMidnightInTimezone(userTimezone)
    } catch (error) {
      console.error(`Error checking midnight for user ${userId}:`, error)
      return false
    }
  }
  
  /**
   * Emit midnight update event (placeholder for real-time communication)
   */
  private static async emitMidnightUpdate(event: MidnightUpdateEvent): Promise<void> {
    // This would integrate with WebSocket or Server-Sent Events
    // For now, we'll just log the event
    console.log('Midnight update event:', {
      userId: event.userId,
      timezone: event.userTimezone,
      timestamp: event.timestamp.toISOString(),
      filters: event.affectedFilters
    })
    
    // In a real implementation, this might:
    // - Send WebSocket message to connected clients
    // - Trigger Server-Sent Events
    // - Update cached filter counts
    // - Invalidate relevant caches
  }
  
  /**
   * Clear midnight timer for a user
   */
  static clearMidnightTimer(userId: string): void {
    const timer = this.midnightTimers.get(userId)
    if (timer) {
      clearTimeout(timer)
      this.midnightTimers.delete(userId)
      this.userTimezones.delete(userId)
    }
  }
  
  /**
   * Clear all midnight timers (for cleanup)
   */
  static clearAllMidnightTimers(): void {
    for (const [userId, timer] of this.midnightTimers) {
      clearTimeout(timer)
    }
    this.midnightTimers.clear()
    this.userTimezones.clear()
  }
  
  /**
   * Get active midnight timers (for monitoring)
   */
  static getActiveMidnightTimers(): Array<{ userId: string; timezone: string; scheduledFor: Date }> {
    const active = []
    
    for (const [userId, timer] of this.midnightTimers) {
      const timezone = this.userTimezones.get(userId) || 'Unknown'
      const now = new Date()
      const msUntilMidnight = this.calculateTimeUntilMidnight(timezone)
      const scheduledFor = new Date(now.getTime() + msUntilMidnight)
      
      active.push({
        userId,
        timezone,
        scheduledFor
      })
    }
    
    return active
  }
  
  /**
   * Force refresh filters for all users (useful for system maintenance)
   */
  static async forceRefreshAllFilters(): Promise<void> {
    console.log('Force refreshing filters for all active users')
    
    for (const [userId, timezone] of this.userTimezones) {
      try {
        TimezoneService.clearUserCache(userId)
        await TaskFilterService.refreshFiltersForTimezone(timezone)
        console.log(`Refreshed filters for user ${userId} (${timezone})`)
      } catch (error) {
        console.error(`Error refreshing filters for user ${userId}:`, error)
      }
    }
  }
}

// Cleanup on process exit
process.on('beforeExit', () => {
  RealtimeUpdateService.clearAllMidnightTimers()
})

process.on('SIGINT', () => {
  RealtimeUpdateService.clearAllMidnightTimers()
  process.exit(0)
})

process.on('SIGTERM', () => {
  RealtimeUpdateService.clearAllMidnightTimers()
  process.exit(0)
})