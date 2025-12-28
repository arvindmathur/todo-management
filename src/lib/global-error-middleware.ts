import React from "react"
import { NextRequest, NextResponse } from "next/server"
import { reportError, formatErrorResponse } from "./errors"

// Global error handler for unhandled errors in API routes
export function setupGlobalErrorHandling() {
  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason)
    reportError(new Error(`Unhandled Rejection: ${reason}`), {
      type: 'unhandled_rejection',
      promise: promise.toString()
    })
  })

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error)
    reportError(error, {
      type: 'uncaught_exception'
    })
    
    // In production, you might want to gracefully shutdown
    if (process.env.NODE_ENV === 'production') {
      process.exit(1)
    }
  })
}

// Middleware wrapper for API routes to catch any unhandled errors
export function withGlobalErrorHandling(handler: Function) {
  return async (request: NextRequest, ...args: any[]) => {
    try {
      return await handler(request, ...args)
    } catch (error) {
      console.error('Unhandled error in API route:', error)
      
      // Report the error
      reportError(error as Error, {
        type: 'api_route_error',
        url: request.url,
        method: request.method,
        headers: Object.fromEntries(request.headers.entries())
      })

      // Return a generic error response
      const errorResponse = formatErrorResponse(
        error as Error,
        request.url
      )

      return NextResponse.json(errorResponse, {
        status: errorResponse.statusCode
      })
    }
  }
}

// Error boundary for React Server Components
export function createServerErrorBoundary(Component: React.ComponentType<any>) {
  return function ServerErrorBoundary(props: any) {
    try {
      return React.createElement(Component, props)
    } catch (error) {
      console.error('Server component error:', error)
      reportError(error as Error, {
        type: 'server_component_error',
        component: Component.name
      })

      // Return a fallback UI
      return React.createElement('div', {
        className: "min-h-screen flex items-center justify-center bg-gray-50"
      }, React.createElement('div', {
        className: "max-w-md w-full bg-white shadow-lg rounded-lg p-6"
      }, "Server Error - Please refresh the page"))
    }
  }
}

// Initialize global error handling
if (typeof window === 'undefined') {
  setupGlobalErrorHandling()
}