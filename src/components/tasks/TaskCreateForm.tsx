"use client"

import { useState } from "react"
import { TaskPriority, CreateTaskRequest } from "@/types/task"

interface TaskCreateFormProps {
  onSubmit: (taskData: CreateTaskRequest) => Promise<any>
  onCancel?: () => void
  isLoading: boolean
}

export function TaskCreateForm({ onSubmit, onCancel, isLoading }: TaskCreateFormProps) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium" as TaskPriority,
    dueDate: "",
    tags: "",
  })
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!formData.title.trim()) {
      setError("Title is required")
      return
    }

    try {
      const taskData: CreateTaskRequest = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        priority: formData.priority,
        dueDate: formData.dueDate || undefined,
        tags: formData.tags
          .split(",")
          .map(tag => tag.trim())
          .filter(tag => tag.length > 0),
      }

      const result = await onSubmit(taskData)
      if (result.success) {
        // Reset form on success
        setFormData({
          title: "",
          description: "",
          priority: "medium",
          dueDate: "",
          tags: "",
        })
      } else {
        setError(result.error || "Failed to create task")
      }
    } catch (err) {
      setError("Failed to create task")
    }
  }

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="bg-white rounded-lg border p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Task</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        {/* Title */}
        <div>
          <label htmlFor="create-title" className="block text-sm font-medium text-gray-700">
            Title *
          </label>
          <input
            type="text"
            id="create-title"
            value={formData.title}
            onChange={(e) => handleChange("title", e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="Enter task title"
            disabled={isLoading}
            required
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="create-description" className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            id="create-description"
            rows={3}
            value={formData.description}
            onChange={(e) => handleChange("description", e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="Enter task description"
            disabled={isLoading}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Priority */}
          <div>
            <label htmlFor="create-priority" className="block text-sm font-medium text-gray-700">
              Priority
            </label>
            <select
              id="create-priority"
              value={formData.priority}
              onChange={(e) => handleChange("priority", e.target.value as TaskPriority)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              disabled={isLoading}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          {/* Due Date */}
          <div>
            <label htmlFor="create-dueDate" className="block text-sm font-medium text-gray-700">
              Due Date
            </label>
            <input
              type="date"
              id="create-dueDate"
              value={formData.dueDate}
              onChange={(e) => handleChange("dueDate", e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Tags */}
        <div>
          <label htmlFor="create-tags" className="block text-sm font-medium text-gray-700">
            Tags
          </label>
          <input
            type="text"
            id="create-tags"
            value={formData.tags}
            onChange={(e) => handleChange("tags", e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="Enter tags separated by commas"
            disabled={isLoading}
          />
          <p className="mt-1 text-xs text-gray-500">
            Separate multiple tags with commas (e.g., work, urgent, meeting)
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={isLoading || !formData.title.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Creating..." : "Create Task"}
          </button>
        </div>
      </form>
    </div>
  )
}