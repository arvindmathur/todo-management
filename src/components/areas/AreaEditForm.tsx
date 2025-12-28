"use client"

import { useState } from "react"
import { Area, UpdateAreaRequest } from "@/types/area"

interface AreaEditFormProps {
  area: Area
  onSave: (updates: UpdateAreaRequest) => Promise<any>
  onCancel: () => void
  isLoading?: boolean
}

const PRESET_COLORS = [
  "#3B82F6", // Blue
  "#10B981", // Green
  "#F59E0B", // Yellow
  "#EF4444", // Red
  "#8B5CF6", // Purple
  "#F97316", // Orange
  "#06B6D4", // Cyan
  "#84CC16", // Lime
  "#EC4899", // Pink
  "#6B7280", // Gray
]

export function AreaEditForm({
  area,
  onSave,
  onCancel,
  isLoading = false,
}: AreaEditFormProps) {
  const [formData, setFormData] = useState<UpdateAreaRequest>({
    name: area.name,
    description: area.description || "",
    color: area.color || PRESET_COLORS[0],
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name?.trim()) {
      newErrors.name = "Area name is required"
    } else if (formData.name.length > 100) {
      newErrors.name = "Area name must be 100 characters or less"
    }

    if (formData.description && formData.description.length > 500) {
      newErrors.description = "Description must be 500 characters or less"
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
    const updates: UpdateAreaRequest = {}
    if (formData.name?.trim() !== area.name) {
      updates.name = formData.name?.trim()
    }
    if ((formData.description?.trim() || "") !== (area.description || "")) {
      updates.description = formData.description?.trim() || undefined
    }
    if (formData.color !== area.color) {
      updates.color = formData.color
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

  const handleInputChange = (field: keyof UpdateAreaRequest, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }))
    }
  }

  const hasChanges = () => {
    return (
      formData.name?.trim() !== area.name ||
      (formData.description?.trim() || "") !== (area.description || "") ||
      formData.color !== area.color
    )
  }

  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Edit Area</h3>
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
        {/* Area Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Area Name *
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
            placeholder="e.g., Work, Personal, Health, Finance"
            maxLength={100}
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Areas represent different aspects of your life (Work, Personal, Health, etc.)
          </p>
        </div>

        {/* Color */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Color
          </label>
          <div className="flex items-center space-x-2">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => handleInputChange("color", color)}
                disabled={isLoading}
                className={`w-8 h-8 rounded-full border-2 transition-all ${
                  formData.color === color 
                    ? "border-gray-900 scale-110" 
                    : "border-gray-300 hover:border-gray-400"
                }`}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Choose a color to help visually organize your areas
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
            placeholder="Describe this area of your life and what it encompasses..."
            maxLength={500}
          />
          {errors.description && (
            <p className="mt-1 text-sm text-red-600">{errors.description}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            {(formData.description || "").length}/500 characters
          </p>
        </div>

        {/* Area Info */}
        {area._count && (
          <div className="bg-gray-50 rounded-md p-3">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div className="flex items-center space-x-4">
                <span className="flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                  {area._count.tasks} task{area._count.tasks === 1 ? '' : 's'}
                </span>
                <span className="flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  {area._count.projects} project{area._count.projects === 1 ? '' : 's'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Preview */}
        {formData.name && (
          <div className="bg-gray-50 rounded-md p-3">
            <p className="text-sm font-medium text-gray-700 mb-2">Preview:</p>
            <div className="flex items-center space-x-3">
              <div 
                className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                style={{ backgroundColor: formData.color }}
              />
              <span className="font-medium">{formData.name}</span>
            </div>
            {formData.description && (
              <p className="text-sm text-gray-600 mt-2 ml-7">{formData.description}</p>
            )}
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