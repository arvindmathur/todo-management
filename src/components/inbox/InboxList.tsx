"use client"

import { InboxItem } from "@/types/inbox"
import { InboxItemComponent } from "./InboxItem"

interface InboxListProps {
  inboxItems: InboxItem[]
  loading: boolean
  error: string | null
  unprocessedCount: number
  onItemUpdate: (itemId: string, updates: any) => Promise<any>
  onItemDelete: (itemId: string) => Promise<any>
  onItemProcess: (itemId: string, processData: any) => Promise<any>
  showProcessed?: boolean
}

export function InboxList({
  inboxItems,
  loading,
  error,
  unprocessedCount,
  onItemUpdate,
  onItemDelete,
  onItemProcess,
  showProcessed = false,
}: InboxListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading inbox...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading inbox</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Filter items based on showProcessed flag
  const filteredItems = showProcessed 
    ? inboxItems 
    : inboxItems.filter(item => !item.processed)

  if (filteredItems.length === 0) {
    return (
      <div className="text-center py-12">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m13-8V4a1 1 0 00-1-1H7a1 1 0 00-1 1v1m8 0V4a1 1 0 00-1-1H9a1 1 0 00-1 1v1m4 6h.01M12 17h.01"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">
          {showProcessed ? "No processed items" : "Inbox is empty"}
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          {showProcessed 
            ? "Items you've processed will appear here."
            : unprocessedCount === 0 
              ? "Great job! You've processed everything. Add new items to capture thoughts and ideas."
              : "Start processing your inbox items to organize your thoughts."
          }
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with count */}
      {!showProcessed && unprocessedCount > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                {unprocessedCount} item{unprocessedCount === 1 ? '' : 's'} to process
              </h3>
              <div className="mt-1 text-sm text-blue-700">
                <p>Process each item by deciding if it's actionable and where it belongs in your system.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Inbox Items */}
      <div className="space-y-3">
        {filteredItems.map((item) => (
          <InboxItemComponent
            key={item.id}
            item={item}
            onUpdate={onItemUpdate}
            onDelete={onItemDelete}
            onProcess={onItemProcess}
          />
        ))}
      </div>

      {/* Processing Progress */}
      {!showProcessed && inboxItems.length > 0 && (
        <div className="bg-gray-50 rounded-md p-4">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Processing Progress</span>
            <span>
              {inboxItems.filter(item => item.processed).length} of {inboxItems.length} processed
            </span>
          </div>
          <div className="mt-2 bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ 
                width: `${inboxItems.length > 0 ? (inboxItems.filter(item => item.processed).length / inboxItems.length) * 100 : 0}%` 
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}