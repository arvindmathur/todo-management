import { ClientError } from "@/lib/errors"
import { cn } from "@/lib/utils"

interface ErrorMessageProps {
  error: ClientError | Error | string
  className?: string
  showRetry?: boolean
  onRetry?: () => void
  showDetails?: boolean
}

export function ErrorMessage({ 
  error, 
  className, 
  showRetry = false, 
  onRetry,
  showDetails = false 
}: ErrorMessageProps) {
  const getErrorInfo = () => {
    if (typeof error === "string") {
      return { message: error, type: "unknown" as const }
    }
    
    if (error instanceof Error) {
      return { message: error.message, type: "unknown" as const }
    }
    
    return error
  }

  const errorInfo = getErrorInfo()

  const getIcon = () => {
    switch (errorInfo.type) {
      case "network":
        return (
          <svg className="h-5 w-5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
          </svg>
        )
      case "authentication":
        return (
          <svg className="h-5 w-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        )
      case "authorization":
        return (
          <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
          </svg>
        )
      case "validation":
        return (
          <svg className="h-5 w-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        )
      default:
        return (
          <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
    }
  }

  const getTitle = () => {
    switch (errorInfo.type) {
      case "network":
        return "Connection Error"
      case "authentication":
        return "Authentication Required"
      case "authorization":
        return "Access Denied"
      case "validation":
        return "Invalid Input"
      case "not_found":
        return "Not Found"
      case "server":
        return "Server Error"
      default:
        return "Error"
    }
  }

  return (
    <div className={cn("rounded-md bg-red-50 border border-red-200 p-4", className)}>
      <div className="flex">
        <div className="flex-shrink-0">
          {getIcon()}
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-red-800">
            {getTitle()}
          </h3>
          <div className="mt-2 text-sm text-red-700">
            <p>{errorInfo.message}</p>
          </div>
          
          {showDetails && errorInfo.details && (
            <div className="mt-3">
              <details className="cursor-pointer">
                <summary className="text-sm font-medium text-red-800 hover:text-red-900">
                  Show details
                </summary>
                <div className="mt-2 text-xs text-red-600 bg-red-100 p-2 rounded border">
                  <pre className="whitespace-pre-wrap break-all">
                    {JSON.stringify(errorInfo.details, null, 2)}
                  </pre>
                </div>
              </details>
            </div>
          )}
          
          {showRetry && onRetry && (
            <div className="mt-4">
              <button
                onClick={onRetry}
                className="bg-red-100 text-red-800 px-3 py-2 rounded-md text-sm font-medium hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function InlineError({ message, className }: { message: string; className?: string }) {
  return (
    <p className={cn("text-sm text-red-600 mt-1", className)}>
      {message}
    </p>
  )
}

export function FieldError({ error }: { error?: string }) {
  if (!error) return null
  
  return (
    <div className="flex items-center mt-1">
      <svg className="h-4 w-4 text-red-400 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span className="text-sm text-red-600">{error}</span>
    </div>
  )
}

export function EmptyState({ 
  title, 
  description, 
  action,
  icon,
  className 
}: {
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  icon?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("text-center py-12", className)}>
      <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
        {icon || (
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-12 w-12">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )}
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      {description && (
        <p className="text-gray-600 mb-6 max-w-sm mx-auto">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}