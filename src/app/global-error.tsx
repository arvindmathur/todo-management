"use client"

import { useEffect } from "react"
import { reportError } from "@/lib/errors"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to our error reporting service
    reportError(error, { 
      type: "global_error",
      digest: error.digest,
      timestamp: new Date().toISOString()
    })
  }, [error])

  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <svg
                  className="h-8 w-8 text-red-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h2 className="text-lg font-medium text-gray-900">
                  Application Error
                </h2>
              </div>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600">
                We encountered an unexpected error. Our team has been notified and is working to fix this issue.
              </p>
            </div>

            {process.env.NODE_ENV === "development" && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
                <p className="text-xs font-mono text-red-800 break-all">
                  {error.message}
                </p>
                {error.digest && (
                  <p className="text-xs font-mono text-red-600 mt-1">
                    Error ID: {error.digest}
                  </p>
                )}
              </div>
            )}

            <div className="flex space-x-3">
              <button
                onClick={() => window.location.href = "/"}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Go Home
              </button>
              <button
                onClick={reset}
                className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}