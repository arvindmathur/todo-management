"use client"

import { useState } from "react"
import { Area } from "@/types/area"
import { AreaEditForm } from "./AreaEditForm"

interface AreaItemProps {
  area: Area
  onUpdate: (areaId: string, updates: any) => Promise<any>
  onDelete: (areaId: string) => Promise<any>
}

export function AreaItem({
  area,
  onUpdate,
  onDelete,
}: AreaItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleDelete = async () => {
    const taskCount = area._count?.tasks || 0
    const projectCount = area._count?.projects || 0
    const totalItems = taskCount + projectCount
    
    let message = `Are you sure you want to delete "${area.name}"?`
    if (totalItems > 0) {
      const items = []
      if (taskCount > 0) items.push(`${taskCount} task${taskCount === 1 ? '' : 's'}`)
      if (projectCount > 0) items.push(`${projectCount} project${projectCount === 1 ? '' : 's'}`)
      message += ` This will unassign it from ${items.join(' and ')}.`
    }
      
    if (window.confirm(message)) {
      setIsLoading(true)
      try {
        await onDelete(area.id)
      } finally {
        setIsLoading(false)
      }
    }
  }

  const handleUpdate = async (updates: any) => {
    setIsLoading(true)
    try {
      const result = await onUpdate(area.id, updates)
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
      <AreaEditForm
        area={area}
        onSave={handleUpdate}
        onCancel={() => setIsEditing(false)}
        isLoading={isLoading}
      />
    )
  }

  return (
    <div className="bg-white rounded-lg border p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-3 mb-3">
            {/* Color indicator */}
            {area.color && (
              <div 
                className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                style={{ backgroundColor: area.color }}
              />
            )}
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{area.name}</h3>
            </div>
          </div>

          {area.description && (
            <p className="text-gray-600 mb-4">{area.description}</p>
          )}

          {/* Stats and Metadata */}
          <div className="flex items-center space-x-6 text-sm text-gray-500">
            <span className="flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              {area._count?.tasks || 0} task{area._count?.tasks === 1 ? '' : 's'}
            </span>
            
            <span className="flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              {area._count?.projects || 0} project{area._count?.projects === 1 ? '' : 's'}
            </span>
            
            <span>
              Created {new Date(area.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2 ml-4">
          <button
            onClick={() => setIsEditing(true)}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Edit area"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          
          <button
            onClick={handleDelete}
            disabled={isLoading}
            className="text-gray-400 hover:text-red-600 transition-colors"
            title="Delete area"
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