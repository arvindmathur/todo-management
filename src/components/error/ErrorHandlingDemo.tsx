"use client"

import { useState } from "react"
import { 
  LoadingSpinner, 
  LoadingButton, 
  LoadingCard,
  ErrorMessage,
  EmptyState,
  useSuccessToast,
  useErrorToast,
  useWarningToast,
  useInfoToast
} from "@/components/feedback"
import { useErrorHandling, useApiCall, useFormSubmission } from "@/hooks/useErrorHandling"
import { useLoadingState } from "@/hooks/useLoadingState"
import { ClientError } from "@/lib/errors"

export function ErrorHandlingDemo() {
  const [demoError, setDemoError] = useState<ClientError | null>(null)
  const { isLoading, startLoading, stopLoading } = useLoadingState()
  const { handleError } = useErrorHandling()
  const { apiCall } = useApiCall()
  const { submitForm } = useFormSubmission()
  
  const showSuccess = useSuccessToast()
  const showError = useErrorToast()
  const showWarning = useWarningToast()
  const showInfo = useInfoToast()

  const simulateNetworkError = () => {
    setDemoError({
      type: "network",
      message: "Unable to connect to the server. Please check your internet connection.",
    })
  }

  const simulateValidationError = () => {
    setDemoError({
      type: "validation",
      message: "Please fill in all required fields correctly.",
      details: {
        title: "Title is required",
        email: "Invalid email format"
      }
    })
  }

  const simulateAuthError = () => {
    setDemoError({
      type: "authentication",
      message: "Your session has expired. Please sign in again.",
    })
  }

  const simulateServerError = () => {
    setDemoError({
      type: "server",
      message: "Internal server error. Our team has been notified.",
      statusCode: 500
    })
  }

  const testApiCall = async () => {
    const result = await apiCall(
      async () => {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 2000))
        if (Math.random() > 0.5) {
          throw new Error("Random API error for testing")
        }
        return { message: "API call successful!" }
      },
      {
        context: "Demo API call",
        onSuccess: (data) => {
          showSuccess("Success!", data.message)
        }
      }
    )
  }

  const testFormSubmission = async () => {
    const result = await submitForm(
      async () => {
        // Simulate form submission
        await new Promise(resolve => setTimeout(resolve, 1500))
        if (Math.random() > 0.7) {
          throw new Error("Form validation failed")
        }
        return { id: "123", message: "Form submitted successfully!" }
      },
      {
        context: "Demo form submission",
        onSuccess: (data) => {
          showSuccess("Form Submitted", data.message)
        }
      }
    )
  }

  const testLoadingStates = async () => {
    startLoading()
    try {
      await new Promise(resolve => setTimeout(resolve, 3000))
      showInfo("Loading Complete", "This was a simulated loading operation")
    } catch (error) {
      await handleError(error, "Loading test")
    } finally {
      stopLoading()
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Error Handling & User Feedback Demo
        </h1>
        
        {/* Toast Notifications */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Toast Notifications</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={() => showSuccess("Success!", "Operation completed successfully")}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
            >
              Success Toast
            </button>
            <button
              onClick={() => showError("Error!", "Something went wrong")}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
            >
              Error Toast
            </button>
            <button
              onClick={() => showWarning("Warning!", "Please review your input")}
              className="bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700"
            >
              Warning Toast
            </button>
            <button
              onClick={() => showInfo("Info", "Here's some helpful information")}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Info Toast
            </button>
          </div>
        </section>

        {/* Error Messages */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Error Messages</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <button
              onClick={simulateNetworkError}
              className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700"
            >
              Network Error
            </button>
            <button
              onClick={simulateValidationError}
              className="bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700"
            >
              Validation Error
            </button>
            <button
              onClick={simulateAuthError}
              className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700"
            >
              Auth Error
            </button>
            <button
              onClick={simulateServerError}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
            >
              Server Error
            </button>
          </div>
          
          {demoError && (
            <ErrorMessage
              error={demoError}
              showRetry={true}
              showDetails={true}
              onRetry={() => setDemoError(null)}
              className="mb-4"
            />
          )}
        </section>

        {/* Loading States */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Loading States</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="font-medium mb-2">Loading Spinner</h3>
              <LoadingSpinner size="lg" text="Processing..." />
            </div>
            
            <div>
              <h3 className="font-medium mb-2">Loading Button</h3>
              <LoadingButton
                loading={isLoading}
                onClick={testLoadingStates}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Test Loading
              </LoadingButton>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">Loading Card</h3>
              <LoadingCard className="h-32" />
            </div>
          </div>
        </section>

        {/* API Integration */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">API Integration</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <LoadingButton
              loading={false}
              onClick={testApiCall}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
            >
              Test API Call
            </LoadingButton>
            <LoadingButton
              loading={false}
              onClick={testFormSubmission}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
            >
              Test Form Submission
            </LoadingButton>
          </div>
        </section>

        {/* Empty States */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Empty States</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <EmptyState
              title="No tasks found"
              description="Get started by creating your first task"
              action={{
                label: "Create Task",
                onClick: () => showInfo("Demo", "This would open the task creation form")
              }}
            />
            <EmptyState
              title="No projects yet"
              description="Organize your tasks by creating projects"
              action={{
                label: "Create Project",
                onClick: () => showInfo("Demo", "This would open the project creation form")
              }}
              icon={
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-12 w-12">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              }
            />
          </div>
        </section>

        {/* Clear Demo Error */}
        {demoError && (
          <div className="text-center">
            <button
              onClick={() => setDemoError(null)}
              className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
            >
              Clear Error
            </button>
          </div>
        )}
      </div>
    </div>
  )
}