import { Redis } from "ioredis"

// Cache configuration
const CACHE_TTL = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 3600, // 1 hour
  VERY_LONG: 86400, // 24 hours
} as const

// Cache key prefixes
const CACHE_KEYS = {
  USER_PREFERENCES: "user:prefs:",
  TASK_COUNT: "task:count:",
  PROJECT_STATS: "project:stats:",
  CONTEXT_LIST: "context:list:",
  AREA_LIST: "area:list:",
  INBOX_COUNT: "inbox:count:",
  AUDIT_STATS: "audit:stats:",
} as const

class CacheService {
  private redis: Redis | null = null
  private memoryCache = new Map<string, { value: any; expires: number }>()

  constructor() {
    // Initialize Redis if available
    if (process.env.REDIS_URL) {
      try {
        this.redis = new Redis(process.env.REDIS_URL, {
          maxRetriesPerRequest: 3,
          lazyConnect: true,
        })

        this.redis.on("error", (error) => {
          console.warn("Redis connection error:", error)
          // Fall back to memory cache
          this.redis = null
        })
      } catch (error) {
        console.warn("Failed to initialize Redis:", error)
      }
    }
  }

  // Get value from cache
  async get<T>(key: string): Promise<T | null> {
    try {
      if (this.redis) {
        const value = await this.redis.get(key)
        return value ? JSON.parse(value) : null
      } else {
        // Use memory cache as fallback
        const cached = this.memoryCache.get(key)
        if (cached && cached.expires > Date.now()) {
          return cached.value
        } else if (cached) {
          this.memoryCache.delete(key)
        }
        return null
      }
    } catch (error) {
      console.warn("Cache get error:", error)
      return null
    }
  }

  // Set value in cache
  async set(key: string, value: any, ttlSeconds: number = CACHE_TTL.MEDIUM): Promise<void> {
    try {
      if (this.redis) {
        await this.redis.setex(key, ttlSeconds, JSON.stringify(value))
      } else {
        // Use memory cache as fallback
        this.memoryCache.set(key, {
          value,
          expires: Date.now() + ttlSeconds * 1000,
        })
        
        // Clean up expired entries periodically
        if (this.memoryCache.size > 1000) {
          this.cleanupMemoryCache()
        }
      }
    } catch (error) {
      console.warn("Cache set error:", error)
    }
  }

  // Delete value from cache
  async del(key: string): Promise<void> {
    try {
      if (this.redis) {
        await this.redis.del(key)
      } else {
        this.memoryCache.delete(key)
      }
    } catch (error) {
      console.warn("Cache delete error:", error)
    }
  }

  // Delete multiple keys matching pattern
  async delPattern(pattern: string): Promise<void> {
    try {
      if (this.redis) {
        const keys = await this.redis.keys(pattern)
        if (keys.length > 0) {
          await this.redis.del(...keys)
        }
      } else {
        // For memory cache, delete keys that match pattern
        const regex = new RegExp(pattern.replace("*", ".*"))
        const keysToDelete: string[] = []
        this.memoryCache.forEach((_, key) => {
          if (regex.test(key)) {
            keysToDelete.push(key)
          }
        })
        keysToDelete.forEach(key => this.memoryCache.delete(key))
      }
    } catch (error) {
      console.warn("Cache delete pattern error:", error)
    }
  }

  // Get or set pattern - fetch from cache or compute and cache
  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttlSeconds: number = CACHE_TTL.MEDIUM
  ): Promise<T> {
    const cached = await this.get<T>(key)
    if (cached !== null) {
      return cached
    }

    const value = await fetchFn()
    await this.set(key, value, ttlSeconds)
    return value
  }

  // Cache user preferences
  async getUserPreferences(userId: string, fetchFn: () => Promise<any>) {
    return this.getOrSet(
      `${CACHE_KEYS.USER_PREFERENCES}${userId}`,
      fetchFn,
      CACHE_TTL.LONG
    )
  }

  // Cache task counts
  async getTaskCount(tenantId: string, userId: string, filters: string, fetchFn: () => Promise<number>) {
    return this.getOrSet(
      `${CACHE_KEYS.TASK_COUNT}${tenantId}:${userId}:${filters}`,
      fetchFn,
      CACHE_TTL.SHORT
    )
  }

  // Cache project statistics
  async getProjectStats(tenantId: string, userId: string, fetchFn: () => Promise<any>) {
    return this.getOrSet(
      `${CACHE_KEYS.PROJECT_STATS}${tenantId}:${userId}`,
      fetchFn,
      CACHE_TTL.MEDIUM
    )
  }

  // Cache context list
  async getContextList(tenantId: string, userId: string, fetchFn: () => Promise<any[]>) {
    return this.getOrSet(
      `${CACHE_KEYS.CONTEXT_LIST}${tenantId}:${userId}`,
      fetchFn,
      CACHE_TTL.LONG
    )
  }

  // Cache area list
  async getAreaList(tenantId: string, userId: string, fetchFn: () => Promise<any[]>) {
    return this.getOrSet(
      `${CACHE_KEYS.AREA_LIST}${tenantId}:${userId}`,
      fetchFn,
      CACHE_TTL.LONG
    )
  }

  // Cache inbox count
  async getInboxCount(tenantId: string, userId: string, fetchFn: () => Promise<number>) {
    return this.getOrSet(
      `${CACHE_KEYS.INBOX_COUNT}${tenantId}:${userId}`,
      fetchFn,
      CACHE_TTL.SHORT
    )
  }

  // Cache audit statistics
  async getAuditStats(tenantId: string, dateRange: string, fetchFn: () => Promise<any>) {
    return this.getOrSet(
      `${CACHE_KEYS.AUDIT_STATS}${tenantId}:${dateRange}`,
      fetchFn,
      CACHE_TTL.MEDIUM
    )
  }

  // Invalidate user-related caches
  async invalidateUserCache(tenantId: string, userId: string): Promise<void> {
    await Promise.all([
      this.delPattern(`${CACHE_KEYS.USER_PREFERENCES}${userId}*`),
      this.delPattern(`${CACHE_KEYS.TASK_COUNT}${tenantId}:${userId}*`),
      this.delPattern(`${CACHE_KEYS.PROJECT_STATS}${tenantId}:${userId}*`),
      this.delPattern(`${CACHE_KEYS.CONTEXT_LIST}${tenantId}:${userId}*`),
      this.delPattern(`${CACHE_KEYS.AREA_LIST}${tenantId}:${userId}*`),
      this.delPattern(`${CACHE_KEYS.INBOX_COUNT}${tenantId}:${userId}*`),
    ])
  }

  // Invalidate tenant-related caches
  async invalidateTenantCache(tenantId: string): Promise<void> {
    await Promise.all([
      this.delPattern(`${CACHE_KEYS.TASK_COUNT}${tenantId}*`),
      this.delPattern(`${CACHE_KEYS.PROJECT_STATS}${tenantId}*`),
      this.delPattern(`${CACHE_KEYS.CONTEXT_LIST}${tenantId}*`),
      this.delPattern(`${CACHE_KEYS.AREA_LIST}${tenantId}*`),
      this.delPattern(`${CACHE_KEYS.INBOX_COUNT}${tenantId}*`),
      this.delPattern(`${CACHE_KEYS.AUDIT_STATS}${tenantId}*`),
    ])
  }

  // Clean up expired memory cache entries
  private cleanupMemoryCache(): void {
    const now = Date.now()
    const keysToDelete: string[] = []
    this.memoryCache.forEach((cached, key) => {
      if (cached.expires <= now) {
        keysToDelete.push(key)
      }
    })
    keysToDelete.forEach(key => this.memoryCache.delete(key))
  }

  // Get cache statistics
  async getStats(): Promise<{ type: string; size?: number; connected?: boolean }> {
    if (this.redis) {
      try {
        const info = await this.redis.info("memory")
        const connected = await this.redis.ping() === "PONG"
        return {
          type: "redis",
          connected,
        }
      } catch (error) {
        return {
          type: "redis",
          connected: false,
        }
      }
    } else {
      return {
        type: "memory",
        size: this.memoryCache.size,
      }
    }
  }
}

// Export singleton instance
export const cache = new CacheService()
export { CACHE_TTL, CACHE_KEYS }