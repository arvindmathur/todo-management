"use client"

import { useInboxCount } from "@/hooks/useInbox"

interface InboxCounterProps {
  showDetails?: boolean
  className?: string
}

export function InboxCounter({ 
  showDetails = false, 
  className = "" 
}: InboxCounterProps) {
  const { count, loading, error } = useInboxCount()

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-6 w-8 bg-gray-200 rounded"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`text-red-500 ${className}`}>
        <span className="text-sm">!</span>
      </div>
    )
  }

  if (showDetails) {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Inbox Status</span>
          {count.unprocessedCount > 0 && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
              {count.unprocessedCount} to process
            </span>
          )}
        </div>
        
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-semibold text-orange-600">
              {count.unprocessedCount}
            </div>
            <div className="text-xs text-gray-500">Unprocessed</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-green-600">
              {count.processedCount}
            </div>
            <div className="text-xs text-gray-500">Processed</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-gray-600">
              {count.totalCount}
            </div>
            <div className="text-xs text-gray-500">Total</div>
          </div>
        </div>

        {count.totalCount > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Processing Rate</span>
              <span>{Math.round(count.processingRate)}%</span>
            </div>
            <div className="bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${count.processingRate}%` }}
              />
            </div>
          </div>
        )}
      </div>
    )
  }

  // Simple counter badge
  if (count.unprocessedCount === 0) {
    return (
      <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 ${className}`}>
        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        Clear
      </div>
    )
  }

  return (
    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 ${className}`}>
      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      {count.unprocessedCount}
    </div>
  )
}