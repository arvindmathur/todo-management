import { NextRequest, NextResponse } from "next/server"
import { auditLogger } from "./audit-logger"

// Rate limiting store (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Maximum requests per window
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
}

interface SecurityConfig {
  rateLimit?: RateLimitConfig
  requireAuth?: boolean
  allowedMethods?: string[]
  corsOrigins?: string[]
}

export class SecurityMiddleware {
  private static instance: SecurityMiddleware
  
  static getInstance(): SecurityMiddleware {
    if (!SecurityMiddleware.instance) {
      SecurityMiddleware.instance = new SecurityMiddleware()
    }
    return SecurityMiddleware.instance
  }

  // Rate limiting
  async checkRateLimit(
    request: NextRequest,
    config: RateLimitConfig,
    identifier?: string
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const key = identifier || this.getClientIdentifier(request)
    const now = Date.now()
    
    // Clean up expired entries
    this.cleanupExpiredEntries(now)
    
    const entry = rateLimitStore.get(key)
    
    if (!entry || now > entry.resetTime) {
      // New window or expired entry
      const resetTime = now + config.windowMs
      rateLimitStore.set(key, { count: 1, resetTime })
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetTime
      }
    }
    
    if (entry.count >= config.maxRequests) {
      // Rate limit exceeded
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime
      }
    }
    
    // Increment counter
    entry.count++
    return {
      allowed: true,
      remaining: config.maxRequests - entry.count,
      resetTime: entry.resetTime
    }
  }

  // Security headers
  addSecurityHeaders(response: NextResponse): NextResponse {
    // Content Security Policy
    response.headers.set(
      "Content-Security-Policy",
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: https:; " +
      "font-src 'self' data:; " +
      "connect-src 'self' ws: wss:; " +
      "frame-ancestors 'none';"
    )

    // Security headers
    response.headers.set("X-Frame-Options", "DENY")
    response.headers.set("X-Content-Type-Options", "nosniff")
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.set("X-XSS-Protection", "1; mode=block")
    
    // HSTS (only in production with HTTPS)
    if (process.env.NODE_ENV === "production") {
      response.headers.set(
        "Strict-Transport-Security",
        "max-age=31536000; includeSubDomains; preload"
      )
    }

    // Remove server information
    response.headers.delete("Server")
    response.headers.delete("X-Powered-By")

    return response
  }

  // CORS handling
  handleCors(request: NextRequest, allowedOrigins: string[] = []): NextResponse | null {
    const origin = request.headers.get("origin")
    
    // Handle preflight requests
    if (request.method === "OPTIONS") {
      const response = new NextResponse(null, { status: 200 })
      
      if (origin && (allowedOrigins.includes(origin) || allowedOrigins.includes("*"))) {
        response.headers.set("Access-Control-Allow-Origin", origin)
      }
      
      response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
      response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization")
      response.headers.set("Access-Control-Max-Age", "86400")
      
      return this.addSecurityHeaders(response)
    }
    
    return null
  }

  // Input validation and sanitization
  validateInput(data: any, rules: ValidationRules): ValidationResult {
    const errors: string[] = []
    const sanitized: any = {}

    for (const [field, rule] of Object.entries(rules)) {
      const value = data[field]
      
      // Required field check
      if (rule.required && (value === undefined || value === null || value === "")) {
        errors.push(`${field} is required`)
        continue
      }
      
      // Skip validation if field is not required and empty
      if (!rule.required && (value === undefined || value === null || value === "")) {
        continue
      }
      
      // Type validation
      if (rule.type && typeof value !== rule.type) {
        errors.push(`${field} must be of type ${rule.type}`)
        continue
      }
      
      // String validations
      if (rule.type === "string" && typeof value === "string") {
        if (rule.minLength && value.length < rule.minLength) {
          errors.push(`${field} must be at least ${rule.minLength} characters`)
          continue
        }
        
        if (rule.maxLength && value.length > rule.maxLength) {
          errors.push(`${field} must be no more than ${rule.maxLength} characters`)
          continue
        }
        
        if (rule.pattern && !rule.pattern.test(value)) {
          errors.push(`${field} format is invalid`)
          continue
        }
        
        // Sanitize string
        sanitized[field] = this.sanitizeString(value, rule.allowHtml)
      } else {
        sanitized[field] = value
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData: sanitized
    }
  }

  // SQL injection prevention (basic)
  detectSqlInjection(input: string): boolean {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
      /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
      /(--|\/\*|\*\/)/,
      /(\b(SCRIPT|JAVASCRIPT|VBSCRIPT)\b)/i
    ]

    return sqlPatterns.some(pattern => pattern.test(input))
  }

  // XSS prevention
  sanitizeString(input: string, allowHtml: boolean = false): string {
    if (!allowHtml) {
      // Remove all HTML tags and decode entities
      return input
        .replace(/<[^>]*>/g, "")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#x27;/g, "'")
        .trim()
    }
    
    // If HTML is allowed, sanitize dangerous elements
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
      .replace(/javascript:/gi, "")
      .replace(/on\w+\s*=/gi, "")
      .trim()
  }

  // Suspicious activity detection
  async detectSuspiciousActivity(
    request: NextRequest,
    tenantId: string,
    userId?: string
  ): Promise<{ suspicious: boolean; reasons: string[] }> {
    const reasons: string[] = []
    const userAgent = request.headers.get("user-agent") || ""
    const ip = this.getClientIdentifier(request)

    // Check for bot-like behavior
    if (this.isSuspiciousUserAgent(userAgent)) {
      reasons.push("Suspicious user agent detected")
    }

    // Check for rapid requests from same IP
    const recentRequests = await this.getRecentRequestCount(ip, 60000) // Last minute
    if (recentRequests > 100) {
      reasons.push("Excessive request rate from IP")
    }

    // Check for SQL injection attempts
    const url = request.url
    const body = await this.safeGetRequestBody(request)
    
    if (this.detectSqlInjection(url) || (body && this.detectSqlInjection(JSON.stringify(body)))) {
      reasons.push("SQL injection attempt detected")
    }

    // Log suspicious activity
    if (reasons.length > 0) {
      await auditLogger.logSecurityEvent(
        tenantId,
        userId,
        "SUSPICIOUS_ACTIVITY",
        {
          reasons,
          userAgent,
          ip,
          url: request.url,
          method: request.method
        },
        request
      )
    }

    return {
      suspicious: reasons.length > 0,
      reasons
    }
  }

  private getClientIdentifier(request: NextRequest): string {
    // Use IP address as identifier
    const forwarded = request.headers.get("x-forwarded-for")
    if (forwarded) {
      return forwarded.split(",")[0].trim()
    }

    return (
      request.headers.get("x-real-ip") ||
      request.headers.get("x-client-ip") ||
      request.headers.get("cf-connecting-ip") ||
      "unknown"
    )
  }

  private cleanupExpiredEntries(now: number): void {
    const keysToDelete: string[] = []
    rateLimitStore.forEach((entry, key) => {
      if (now > entry.resetTime) {
        keysToDelete.push(key)
      }
    })
    keysToDelete.forEach(key => rateLimitStore.delete(key))
  }

  private isSuspiciousUserAgent(userAgent: string): boolean {
    const suspiciousPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scraper/i,
      /curl/i,
      /wget/i,
      /python/i,
      /java/i,
      /go-http-client/i
    ]

    return suspiciousPatterns.some(pattern => pattern.test(userAgent))
  }

  private async getRecentRequestCount(identifier: string, windowMs: number): Promise<number> {
    // In a real implementation, this would query a database or cache
    // For now, return 0 to avoid false positives
    return 0
  }

  private async safeGetRequestBody(request: NextRequest): Promise<any> {
    try {
      const contentType = request.headers.get("content-type")
      if (contentType?.includes("application/json")) {
        return await request.json()
      }
    } catch {
      // Ignore parsing errors
    }
    return null
  }
}

// Types
interface ValidationRule {
  required?: boolean
  type?: "string" | "number" | "boolean" | "object"
  minLength?: number
  maxLength?: number
  pattern?: RegExp
  allowHtml?: boolean
}

interface ValidationRules {
  [field: string]: ValidationRule
}

interface ValidationResult {
  isValid: boolean
  errors: string[]
  sanitizedData: any
}

// Export singleton instance
export const securityMiddleware = SecurityMiddleware.getInstance()

// Common validation rules
export const commonValidationRules = {
  email: {
    required: true,
    type: "string" as const,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    maxLength: 255
  },
  password: {
    required: true,
    type: "string" as const,
    minLength: 8,
    maxLength: 128
  },
  title: {
    required: true,
    type: "string" as const,
    minLength: 1,
    maxLength: 255
  },
  description: {
    required: false,
    type: "string" as const,
    maxLength: 2000,
    allowHtml: false
  },
  id: {
    required: true,
    type: "string" as const,
    pattern: /^[a-zA-Z0-9_-]+$/
  }
}