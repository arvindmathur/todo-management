"use client"

import { useState } from "react"
import { Context, UpdateContextRequest } from "@/types/context"

interface ContextEditFormProps {
  context: Context
  onSave: (updates: UpdateContextRequest) => Promise<any>
  onCancel: () => void
  isLoading?: boolean
}

export function ContextEditForm({
  context,
  onSave,
  onCancel,
  isLoading = false,
}: ContextEditFormProps) {
  const [formData, setFormData] = useState<UpdateContextRequest>({
    name: context.name,
    description: context.description || "",
    icon: context.icon || "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name?.trim()) {
      newErrors.name = "Context name is required"
    } else if (formData.name.length > 100) {
      newErrors.name = "Context name must be 100 characters or less"
    }

    if (formData.description && formData.description.length > 500) {
      newErrors.description = "Description must be 500 characters or less"
    }

    if (formData.icon && formData.icon.length > 10) {
      newErrors.icon = "Icon must be 10 characters or less"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    // Only send changed fields
    const updates: UpdateContextRequest = {}
    if (formData.name?.trim() !== context.name) {
      updates.name = formData.name?.trim()
    }
    if ((formData.description?.trim() || "") !== (context.description || "")) {
      updates.description = formData.description?.trim() || undefined
    }
    if ((formData.icon?.trim() || "") !== (context.icon || "")) {
      updates.icon = formData.icon?.trim() || undefined
    }

    // If no changes, just cancel
    if (Object.keys(updates).length === 0) {
      onCancel()
      return
    }

    const result = await onSave(updates)

    if (result.success) {
      // Form will be closed by parent component
    }
  }

  const handleInputChange = (field: keyof UpdateContextRequest, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }))
    }
  }

  const hasChanges = () => {
    return (
      formData.name?.trim() !== context.name ||
      (formData.description?.trim() || "") !== (context.description || "") ||
      (formData.icon?.trim() || "") !== (context.icon || "")
    )
  }

  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          Edit Context
          {context.isDefault && (
            <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Default
            </span>
          )}
        </h3>
        <button
          onClick={onCancel}
          disabled={isLoading}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Context Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Context Name *
          </label>
          <input
            type="text"
            id="name"
            value={formData.name || ""}
            onChange={(e) => handleInputChange("name", e.target.value)}
            disabled={isLoading}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.name ? "border-red-300" : "border-gray-300"
            }`}
            placeholder="e.g., @computer, @calls, @errands"
            maxLength={100}
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Use @ prefix for GTD-style contexts (e.g., @computer, @phone)
          </p>
        </div>

        {/* Icon */}
        <div>
          <label htmlFor="icon" className="block text-sm font-medium text-gray-700 mb-1">
            Icon (Optional)
          </label>
          <div className="flex items-center space-x-3">
            <input
              type="text"
              id="icon"
              value={formData.icon || ""}
              onChange={(e) => handleInputChange("icon", e.target.value)}
              disabled={isLoading}
              className={`flex-1 px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.icon ? "border-red-300" : "border-gray-300"
              }`}
              placeholder="💻 📞 🏃‍♂️"
              maxLength={10}
            />
            {formData.icon && (
              <div className="flex items-center justify-center w-10 h-10 bg-gray-100 rounded-md">
                <span className="text-xl">{formData.icon}</span>
              </div>
            )}
          </div>
          {errors.icon && (
            <p className="mt-1 text-sm text-red-600">{errors.icon}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Add an emoji or symbol to represent this context
          </p>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description (Optional)
          </label>
          <textarea
            id="description"
            value={formData.description || ""}
            onChange={(e) => handleInputChange("description", e.target.value)}
            disabled={isLoading}
            rows={3}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.description ? "border-red-300" : "border-gray-300"
            }`}
            placeholder="Describe when and how to use this context..."
            maxLength={500}
          />
          {errors.description && (
            <p className="mt-1 text-sm text-red-600">{errors.description}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            {(formData.description || "").length}/500 characters
          </p>
        </div>

        {/* Context Info */}
        {context._count && (
          <div className="bg-gray-50 rounded-md p-3">
            <div className="flex items-center text-sm text-gray-600">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              This context is assigned to {context._count.tasks} task{context._count.tasks === 1 ? '' : 's'}
            </div>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex items-center justify-end space-x-3 pt-4 border-t">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading || !formData.name?.trim() || !hasChanges()}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isLoading && (
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            Save Changes
          </button>
        </div>
      </form>
    </div>
  )
}