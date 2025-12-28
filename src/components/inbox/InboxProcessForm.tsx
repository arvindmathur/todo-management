"use client"

import { useState, useEffect } from "react"
import { InboxItem, ProcessInboxItemRequest } from "@/types/inbox"
import { useProjects } from "@/hooks/useProjects"
import { useContexts } from "@/hooks/useContexts"
import { useAreas } from "@/hooks/useAreas"

interface InboxProcessFormProps {
  item: InboxItem
  onProcess: (processData: ProcessInboxItemRequest) => Promise<any>
  onCancel: () => void
  isLoading?: boolean
}

type ProcessAction = "convert_to_task" | "convert_to_project" | "mark_as_reference" | "delete"

export function InboxProcessForm({
  item,
  onProcess,
  onCancel,
  isLoading = false,
}: InboxProcessFormProps) {
  const [selectedAction, setSelectedAction] = useState<ProcessAction | null>(null)
  const [taskData, setTaskData] = useState({
    title: item.content.slice(0, 100), // Use first 100 chars as title
    description: item.content.length > 100 ? item.content : "",
    priority: "medium" as const,
    dueDate: "",
    projectId: "",
    contextId: "",
    areaId: "",
    tags: [] as string[],
  })
  const [projectData, setProjectData] = useState({
    name: item.content.slice(0, 100),
    description: item.content.length > 100 ? item.content : "",
    areaId: "",
    outcome: "",
  })
  const [referenceNote, setReferenceNote] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Load data for dropdowns
  const { projects } = useProjects({ status: "active" })
  const { contexts } = useContexts()
  const { areas } = useAreas()

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (selectedAction === "convert_to_task") {
      if (!taskData.title.trim()) {
        newErrors.title = "Task title is required"
      }
    } else if (selectedAction === "convert_to_project") {
      if (!projectData.name.trim()) {
        newErrors.name = "Project name is required"
      }
    } else if (selectedAction === "mark_as_reference") {
      if (!referenceNote.trim()) {
        newErrors.referenceNote = "Reference note is required"
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedAction) return
    if (!validateForm()) return

    const processData: ProcessInboxItemRequest = {
      action: selectedAction,
    }

    if (selectedAction === "convert_to_task") {
      processData.taskData = {
        title: taskData.title.trim(),
        description: taskData.description?.trim() || undefined,
        priority: taskData.priority,
        dueDate: taskData.dueDate || undefined,
        projectId: taskData.projectId || undefined,
        contextId: taskData.contextId || undefined,
        areaId: taskData.areaId || undefined,
        tags: taskData.tags.length > 0 ? taskData.tags : undefined,
      }
    } else if (selectedAction === "convert_to_project") {
      processData.projectData = {
        name: projectData.name.trim(),
        description: projectData.description?.trim() || undefined,
        areaId: projectData.areaId || undefined,
        outcome: projectData.outcome?.trim() || undefined,
      }
    } else if (selectedAction === "mark_as_reference") {
      processData.referenceNote = referenceNote.trim()
    }

    const result = await onProcess(processData)
    return result
  }

  const actionOptions = [
    {
      id: "convert_to_task" as const,
      title: "Convert to Task",
      description: "This is something actionable I need to do",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
    },
    {
      id: "convert_to_project" as const,
      title: "Convert to Project",
      description: "This requires multiple steps to complete",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
    },
    {
      id: "mark_as_reference" as const,
      title: "Mark as Reference",
      description: "This is information I might need later",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      id: "delete" as const,
      title: "Delete",
      description: "This is not actionable or useful",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      ),
    },
  ]

  return (
    <div className="bg-white rounded-lg border-2 border-blue-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Process Inbox Item</h3>
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

      {/* Original Content */}
      <div className="bg-gray-50 rounded-md p-4 mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Original Content:</h4>
        <p className="text-gray-900 whitespace-pre-wrap">{item.content}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Action Selection */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">What would you like to do with this item?</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {actionOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setSelectedAction(option.id)}
                disabled={isLoading}
                className={`p-4 border rounded-lg text-left transition-all ${
                  selectedAction === option.id
                    ? "border-blue-500 bg-blue-50 text-blue-900"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className={`${selectedAction === option.id ? "text-blue-600" : "text-gray-400"}`}>
                    {option.icon}
                  </div>
                  <div>
                    <h5 className="font-medium">{option.title}</h5>
                    <p className="text-sm text-gray-600 mt-1">{option.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Task Form */}
        {selectedAction === "convert_to_task" && (
          <div className="space-y-4 border-t pt-6">
            <h4 className="text-sm font-medium text-gray-700">Task Details</h4>
            
            <div>
              <label htmlFor="task-title" className="block text-sm font-medium text-gray-700 mb-1">
                Title *
              </label>
              <input
                type="text"
                id="task-title"
                value={taskData.title}
                onChange={(e) => setTaskData(prev => ({ ...prev, title: e.target.value }))}
                disabled={isLoading}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.title ? "border-red-300" : "border-gray-300"
                }`}
                maxLength={200}
              />
              {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
            </div>

            <div>
              <label htmlFor="task-description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="task-description"
                value={taskData.description}
                onChange={(e) => setTaskData(prev => ({ ...prev, description: e.target.value }))}
                disabled={isLoading}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                maxLength={1000}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="task-priority" className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <select
                  id="task-priority"
                  value={taskData.priority}
                  onChange={(e) => setTaskData(prev => ({ ...prev, priority: e.target.value as any }))}
                  disabled={isLoading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div>
                <label htmlFor="task-due-date" className="block text-sm font-medium text-gray-700 mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  id="task-due-date"
                  value={taskData.dueDate}
                  onChange={(e) => setTaskData(prev => ({ ...prev, dueDate: e.target.value }))}
                  disabled={isLoading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="task-project" className="block text-sm font-medium text-gray-700 mb-1">
                  Project
                </label>
                <select
                  id="task-project"
                  value={taskData.projectId}
                  onChange={(e) => setTaskData(prev => ({ ...prev, projectId: e.target.value }))}
                  disabled={isLoading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">No project</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="task-context" className="block text-sm font-medium text-gray-700 mb-1">
                  Context
                </label>
                <select
                  id="task-context"
                  value={taskData.contextId}
                  onChange={(e) => setTaskData(prev => ({ ...prev, contextId: e.target.value }))}
                  disabled={isLoading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">No context</option>
                  {contexts.map((context) => (
                    <option key={context.id} value={context.id}>
                      {context.icon} {context.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="task-area" className="block text-sm font-medium text-gray-700 mb-1">
                  Area
                </label>
                <select
                  id="task-area"
                  value={taskData.areaId}
                  onChange={(e) => setTaskData(prev => ({ ...prev, areaId: e.target.value }))}
                  disabled={isLoading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">No area</option>
                  {areas.map((area) => (
                    <option key={area.id} value={area.id}>
                      {area.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Project Form */}
        {selectedAction === "convert_to_project" && (
          <div className="space-y-4 border-t pt-6">
            <h4 className="text-sm font-medium text-gray-700">Project Details</h4>
            
            <div>
              <label htmlFor="project-name" className="block text-sm font-medium text-gray-700 mb-1">
                Name *
              </label>
              <input
                type="text"
                id="project-name"
                value={projectData.name}
                onChange={(e) => setProjectData(prev => ({ ...prev, name: e.target.value }))}
                disabled={isLoading}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.name ? "border-red-300" : "border-gray-300"
                }`}
                maxLength={200}
              />
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
            </div>

            <div>
              <label htmlFor="project-description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="project-description"
                value={projectData.description}
                onChange={(e) => setProjectData(prev => ({ ...prev, description: e.target.value }))}
                disabled={isLoading}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                maxLength={1000}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="project-area" className="block text-sm font-medium text-gray-700 mb-1">
                  Area
                </label>
                <select
                  id="project-area"
                  value={projectData.areaId}
                  onChange={(e) => setProjectData(prev => ({ ...prev, areaId: e.target.value }))}
                  disabled={isLoading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">No area</option>
                  {areas.map((area) => (
                    <option key={area.id} value={area.id}>
                      {area.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="project-outcome" className="block text-sm font-medium text-gray-700 mb-1">
                  Desired Outcome
                </label>
                <input
                  type="text"
                  id="project-outcome"
                  value={projectData.outcome}
                  onChange={(e) => setProjectData(prev => ({ ...prev, outcome: e.target.value }))}
                  disabled={isLoading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="What does success look like?"
                  maxLength={200}
                />
              </div>
            </div>
          </div>
        )}

        {/* Reference Form */}
        {selectedAction === "mark_as_reference" && (
          <div className="space-y-4 border-t pt-6">
            <h4 className="text-sm font-medium text-gray-700">Reference Note</h4>
            
            <div>
              <label htmlFor="reference-note" className="block text-sm font-medium text-gray-700 mb-1">
                Note *
              </label>
              <textarea
                id="reference-note"
                value={referenceNote}
                onChange={(e) => setReferenceNote(e.target.value)}
                disabled={isLoading}
                rows={3}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.referenceNote ? "border-red-300" : "border-gray-300"
                }`}
                placeholder="Add a note about why this is useful for future reference..."
                maxLength={1000}
              />
              {errors.referenceNote && <p className="mt-1 text-sm text-red-600">{errors.referenceNote}</p>}
            </div>
          </div>
        )}

        {/* Delete Confirmation */}
        {selectedAction === "delete" && (
          <div className="border-t pt-6">
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Confirm Deletion</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>This item will be permanently deleted and cannot be recovered.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex items-center justify-end space-x-3 pt-6 border-t">
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
            disabled={isLoading || !selectedAction}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isLoading && (
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {selectedAction === "delete" ? "Delete Item" : "Process Item"}
          </button>
        </div>
      </form>
    </div>
  )
}