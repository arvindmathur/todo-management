"use client"

import { useState } from "react"
import { Project, UpdateProjectRequest } from "@/types/project"
import { useAreas } from "@/hooks/useAreas"

interface ProjectEditFormProps {
  project: Project
  onSave: (updates: UpdateProjectRequest) => Promise<any>
  onCancel: () => void
  isLoading: boolean
}

export function ProjectEditForm({ project, onSave, onCancel, isLoading }: ProjectEditFormProps) {
  const [formData, setFormData] = useState<UpdateProjectRequest>({
    name: project.name,
    description: project.description || "",
    status: project.status,
    areaId: project.areaId || "",
    outcome: project.outcome || "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { areas } = useAreas()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Basic validation
    const newErrors: Record<string, string> = {}
    if (!formData.name?.trim()) {
      newErrors.name = "Project name is required"
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    // Clean up data and only include changed fields
    const updates: UpdateProjectRequest = {}
    
    if (formData.name?.trim() !== project.name) {
      updates.name = formData.name?.trim() || ''
    }
    
    const newDescription = formData.description?.trim() || undefined
    if (newDescription !== project.description) {
      updates.description = newDescription
    }
    
    if (formData.status !== project.status) {
      updates.status = formData.status
    }
    
    const newAreaId = formData.areaId || null
    if (newAreaId !== project.areaId) {
      updates.areaId = newAreaId
    }
    
    const newOutcome = formData.outcome?.trim() || undefined
    if (newOutcome !== project.outcome) {
      updates.outcome = newOutcome
    }

    // Only submit if there are changes
    if (Object.keys(updates).length === 0) {
      onCancel()
      return
    }

    const result = await onSave(updates)
    if (result.success) {
      // Form will be closed by parent component
    } else {
      setErrors({ submit: result.error || "Failed to update project" })
    }
  }

  const handleChange = (field: keyof UpdateProjectRequest, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }))
    }
  }

  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Edit Project</h3>
        <button
          onClick={onCancel}
          disabled={isLoading}
          className="text-gray-400 hover:text-gray-600"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Project Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Project Name *
          </label>
          <input
            type="text"
            id="name"
            value={formData.name}
            onChange={(e) => handleChange("name", e.target.value)}
            className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
              errors.name ? "border-red-300" : ""
            }`}
            placeholder="Enter project name"
            disabled={isLoading}
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => handleChange("description", e.target.value)}
            rows={3}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="Describe the project (optional)"
            disabled={isLoading}
          />
        </div>

        {/* Status */}
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            id="status"
            value={formData.status}
            onChange={(e) => handleChange("status", e.target.value as any)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            disabled={isLoading}
          >
            <option value="active">Active</option>
            <option value="someday">Someday/Maybe</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        {/* Area */}
        <div>
          <label htmlFor="areaId" className="block text-sm font-medium text-gray-700 mb-1">
            Area
          </label>
          <select
            id="areaId"
            value={formData.areaId || ''}
            onChange={(e) => handleChange("areaId", e.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            disabled={isLoading}
          >
            <option value="">No area</option>
            {areas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.name}
              </option>
            ))}
          </select>
        </div>

        {/* Outcome */}
        <div>
          <label htmlFor="outcome" className="block text-sm font-medium text-gray-700 mb-1">
            Desired Outcome
          </label>
          <input
            type="text"
            id="outcome"
            value={formData.outcome}
            onChange={(e) => handleChange("outcome", e.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="What does success look like? (optional)"
            disabled={isLoading}
          />
        </div>

        {/* Submit Error */}
        {errors.submit && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-sm text-red-600">{errors.submit}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3 pt-4">
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
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 flex items-center"
          >
            {isLoading && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            )}
            Save Changes
          </button>
        </div>
      </form>
    </div>
  )
}