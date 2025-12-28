"use client"

import { useState } from "react"
import { InboxItem } from "@/types/inbox"
import { InboxProcessForm } from "./InboxProcessForm"

interface InboxItemProps {
  item: InboxItem
  onUpdate: (itemId: string, updates: any) => Promise<any>
  onDelete: (itemId: string) => Promise<any>
  onProcess: (itemId: string, processData: any) => Promise<any>
}

export function InboxItemComponent({
  item,
  onUpdate,
  onDelete,
  onProcess,
}: InboxItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [editContent, setEditContent] = useState(item.content)

  const handleEdit = async () => {
    if (editContent.trim() === item.content) {
      setIsEditing(false)
      return
    }

    setIsLoading(true)
    try {
      const result = await onUpdate(item.id, { content: editContent.trim() })
      if (result.success) {
        setIsEditing(false)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this inbox item?")) {
      setIsLoading(true)
      try {
        await onDelete(item.id)
      } finally {
        setIsLoading(false)
      }
    }
  }

  const handleProcess = async (processData: any) => {
    setIsLoading(true)
    try {
      const result = await onProcess(item.id, processData)
      if (result.success) {
        setIsProcessing(false)
      }
      return result
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancelEdit = () => {
    setEditContent(item.content)
    setIsEditing(false)
  }

  if (isProcessing) {
    return (
      <InboxProcessForm
        item={item}
        onProcess={handleProcess}
        onCancel={() => setIsProcessing(false)}
        isLoading={isLoading}
      />
    )
  }

  return (
    <div className={`bg-white rounded-lg border p-4 transition-all ${
      item.processed 
        ? "border-green-200 bg-green-50" 
        : "border-gray-200 hover:shadow-md"
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          {/* Status indicator */}
          <div className="flex items-center space-x-2 mb-2">
            {item.processed ? (
              <div className="flex items-center text-green-600">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-xs font-medium">Processed</span>
              </div>
            ) : (
              <div className="flex items-center text-orange-600">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-xs font-medium">Needs Processing</span>
              </div>
            )}
            <span className="text-xs text-gray-500">
              {new Date(item.createdAt).toLocaleDateString()}
            </span>
          </div>

          {/* Content */}
          {isEditing ? (
            <div className="space-y-3">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                disabled={isLoading}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="What's on your mind?"
                maxLength={1000}
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  {editContent.length}/1000 characters
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleCancelEdit}
                    disabled={isLoading}
                    className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleEdit}
                    disabled={isLoading || !editContent.trim() || editContent.trim() === item.content}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="prose prose-sm max-w-none">
              <p className="text-gray-900 whitespace-pre-wrap">{item.content}</p>
            </div>
          )}

          {/* Processed info */}
          {item.processed && item.processedAt && (
            <div className="mt-3 text-xs text-green-600">
              Processed on {new Date(item.processedAt).toLocaleDateString()} at{" "}
              {new Date(item.processedAt).toLocaleTimeString()}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2 ml-4">
          {!item.processed && (
            <>
              <button
                onClick={() => setIsProcessing(true)}
                disabled={isLoading}
                className="text-blue-600 hover:text-blue-800 transition-colors"
                title="Process this item"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </button>
              
              <button
                onClick={() => setIsEditing(true)}
                disabled={isLoading}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                title="Edit item"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            </>
          )}
          
          <button
            onClick={handleDelete}
            disabled={isLoading}
            className="text-gray-400 hover:text-red-600 transition-colors"
            title="Delete item"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}