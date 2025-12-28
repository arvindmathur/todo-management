"use client"

import { useState } from "react"
import { CreateProjectRequest } from "@/types/project"
import { useAreas } from "@/hooks/useAreas"

interface ProjectCreateFormProps {
  onSubmit: (projectData: CreateProjectRequest) => Promise<any>
  onCancel: () => void
  isLoading: boolean
}

export function ProjectCreateForm({ onSubmit, onCancel, isLoading }: ProjectCreateFormProps) {
  const [formData, setFormData] = useState<CreateProjectRequest>({
    name: "",
    description: "",
    areaId: "",
    outcome: "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { areas } = useAreas()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Basic validation
    const newErrors: Record<string, string> = {}
    if (!formData.name.trim()) {
      newErrors.name = "Project name is required"
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    // Clean up data
    const submitData = {
      ...formData,
      name: formData.name.trim(),
      description: formData.description?.trim() || undefined,
      areaId: formData.areaId || undefined,
      outcome: formData.outcome?.trim() || undefined,
    }

    const result = await onSubmit(submitData)
    if (result.success) {
      // Form will be closed by parent component
    } else {
      setErrors({ submit: result.error || "Failed to create project" })
    }
  }

  const handleChange = (field: keyof CreateProjectRequest, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }))
    }
  }

  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Create New Project</h3>
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

        {/* Area */}
        <div>
          <label htmlFor="areaId" className="block text-sm font-medium text-gray-700 mb-1">
            Area
          </label>
          <select
            id="areaId"
            value={formData.areaId}
            onChange={(e) => handleChange("areaId", e.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            disabled={isLoading}
          >
            <option value="">Select an area (optional)</option>
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
            Create Project
          </button>
        </div>
      </form>
    </div>
  )
}