"use client"

import { useState } from "react"
import { Context } from "@/types/context"
import { ContextEditForm } from "./ContextEditForm"

interface ContextItemProps {
  context: Context
  onUpdate: (contextId: string, updates: any) => Promise<any>
  onDelete: (contextId: string) => Promise<any>
  compact?: boolean
}

export function ContextItem({
  context,
  onUpdate,
  onDelete,
  compact = false,
}: ContextItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleDelete = async () => {
    const taskCount = context._count?.tasks || 0
    const message = taskCount > 0 
      ? `Are you sure you want to delete "${context.name}"? This will unassign it from ${taskCount} task${taskCount === 1 ? '' : 's'}.`
      : `Are you sure you want to delete "${context.name}"?`
      
    if (window.confirm(message)) {
      setIsLoading(true)
      try {
        await onDelete(context.id)
      } finally {
        setIsLoading(false)
      }
    }
  }

  const handleUpdate = async (updates: any) => {
    setIsLoading(true)
    try {
      const result = await onUpdate(context.id, updates)
      if (result.success) {
        setIsEditing(false)
      }
      return result
    } finally {
      setIsLoading(false)
    }
  }

  if (isEditing) {
    return (
      <ContextEditForm
        context={context}
        onSave={handleUpdate}
        onCancel={() => setIsEditing(false)}
        isLoading={isLoading}
      />
    )
  }

  if (compact) {
    // Compact view for default contexts
    return (
      <div className="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {context.icon && (
              <span className="text-2xl">{context.icon}</span>
            )}
            <div>
              <h4 className="font-medium text-gray-900">{context.name}</h4>
              {context.description && (
                <p className="text-sm text-gray-600 mt-1">{context.description}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Task Count */}
            {(context._count?.tasks || 0) > 0 && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {context._count?.tasks} task{context._count?.tasks === 1 ? '' : 's'}
              </span>
            )}
            
            {/* Actions */}
            <button
              onClick={() => setIsEditing(true)}
              disabled={isLoading}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              title="Edit context"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            
            {!context.isDefault && (
              <button
                onClick={handleDelete}
                disabled={isLoading}
                className="text-gray-400 hover:text-red-600 transition-colors"
                title="Delete context"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Full view for custom contexts
  return (
    <div className="bg-white rounded-lg border p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-3 mb-3">
            {context.icon && (
              <span className="text-3xl">{context.icon}</span>
            )}
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{context.name}</h3>
              {context.isDefault && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 mt-1">
                  Default GTD Context
                </span>
              )}
            </div>
          </div>

          {context.description && (
            <p className="text-gray-600 mb-4">{context.description}</p>
          )}

          {/* Task Count and Metadata */}
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <span className="flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              {context._count?.tasks || 0} active task{context._count?.tasks === 1 ? '' : 's'}
            </span>
            
            <span>
              Created {new Date(context.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2 ml-4">
          <button
            onClick={() => setIsEditing(true)}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Edit context"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          
          {!context.isDefault && (
            <button
              onClick={handleDelete}
              disabled={isLoading}
              className="text-gray-400 hover:text-red-600 transition-colors"
              title="Delete context"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}