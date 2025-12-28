"use client"

import { useEffect } from "react"
import { reportError } from "@/lib/errors"
import { ErrorMessage } from "@/components/feedback"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to our error reporting service
    reportError(error, { 
      type: "dashboard_error",
      digest: error.digest,
      timestamp: new Date().toISOString(),
      page: "dashboard"
    })
  }, [error])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <ErrorMessage
          error={{
            type: "server",
            message: "Something went wrong with the dashboard. Please try again.",
            details: process.env.NODE_ENV === "development" ? {
              message: error.message,
              digest: error.digest
            } : undefined
          }}
          showRetry={true}
          showDetails={process.env.NODE_ENV === "development"}
          onRetry={reset}
        />
        
        <div className="mt-6 text-center">
          <button
            onClick={() => window.location.href = "/"}
            className="text-sm text-gray-600 hover:text-gray-800 underline"
          >
            Go back to home page
          </button>
        </div>
      </div>
    </div>
  )
}