"use client"

import { useState } from "react"
import { CreateInboxItemRequest } from "@/types/inbox"

interface InboxCreateFormProps {
  onAdd: (itemData: CreateInboxItemRequest) => Promise<any>
  isLoading?: boolean
  compact?: boolean
}

export function InboxCreateForm({
  onAdd,
  isLoading = false,
  compact = false,
}: InboxCreateFormProps) {
  const [content, setContent] = useState("")
  const [isExpanded, setIsExpanded] = useState(!compact)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!content.trim()) {
      newErrors.content = "Content is required"
    } else if (content.length > 1000) {
      newErrors.content = "Content must be 1000 characters or less"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    const result = await onAdd({
      content: content.trim(),
    })

    if (result.success) {
      setContent("")
      if (compact) {
        setIsExpanded(false)
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSubmit(e as any)
    }
  }

  if (compact && !isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        disabled={isLoading}
        className="w-full p-4 text-left border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-colors group"
      >
        <div className="flex items-center space-x-3">
          <svg className="w-5 h-5 text-gray-400 group-hover:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span className="text-gray-500 group-hover:text-gray-600">
            Capture a thought, idea, or task...
          </span>
        </div>
      </button>
    )
  }

  return (
    <div className="bg-white rounded-lg border p-4">
      {compact && (
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-900">Add to Inbox</h3>
          <button
            onClick={() => {
              setIsExpanded(false)
              setContent("")
              setErrors({})
            }}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="inbox-content" className="block text-sm font-medium text-gray-700 mb-1">
            {compact ? "What's on your mind?" : "Capture anything that comes to mind"}
          </label>
          <textarea
            id="inbox-content"
            value={content}
            onChange={(e) => {
              setContent(e.target.value)
              if (errors.content) {
                setErrors(prev => ({ ...prev, content: "" }))
              }
            }}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            rows={compact ? 3 : 4}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.content ? "border-red-300" : "border-gray-300"
            }`}
            placeholder="Ideas, tasks, thoughts, reminders, anything..."
            maxLength={1000}
          />
          {errors.content && (
            <p className="mt-1 text-sm text-red-600">{errors.content}</p>
          )}
          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-gray-500">
              {content.length}/1000 characters
            </p>
            <p className="text-xs text-gray-500">
              Press Cmd/Ctrl + Enter to add quickly
            </p>
          </div>
        </div>

        {!compact && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">GTD Inbox Tip</h3>
                <div className="mt-1 text-sm text-blue-700">
                  <p>Don't worry about organizing now - just capture everything. You'll process and organize these items later.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end space-x-3">
          {compact && (
            <button
              type="button"
              onClick={() => {
                setIsExpanded(false)
                setContent("")
                setErrors({})
              }}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={isLoading || !content.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isLoading && (
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            Add to Inbox
          </button>
        </div>
      </form>
    </div>
  )
}