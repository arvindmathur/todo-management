"use client"

import { useState } from "react"
import { Project } from "@/types/project"
import { ProjectEditForm } from "./ProjectEditForm"
import { getProjectStatusColor, getProjectStatusLabel } from "@/lib/tasks"

interface ProjectItemProps {
  project: Project
  onUpdate: (projectId: string, updates: any) => Promise<any>
  onDelete: (projectId: string, options?: any) => Promise<any>
  onComplete: (projectId: string) => Promise<any>
  onReopen: (projectId: string) => Promise<any>
}

export function ProjectItem({
  project,
  onUpdate,
  onDelete,
  onComplete,
  onReopen,
}: ProjectItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showDeleteOptions, setShowDeleteOptions] = useState(false)

  const handleComplete = async () => {
    setIsLoading(true)
    try {
      if (project.status === "completed") {
        await onReopen(project.id)
      } else {
        await onComplete(project.id)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (taskAction: "delete" | "unassign" | "move" = "unassign") => {
    if (window.confirm(`Are you sure you want to delete this project? Associated tasks will be ${taskAction === "delete" ? "deleted" : taskAction === "move" ? "moved to another project" : "unassigned"}.`)) {
      setIsLoading(true)
      try {
        await onDelete(project.id, { taskAction })
        setShowDeleteOptions(false)
      } finally {
        setIsLoading(false)
      }
    }
  }

  const handleUpdate = async (updates: any) => {
    setIsLoading(true)
    try {
      const result = await onUpdate(project.id, updates)
      if (result.success) {
        setIsEditing(false)
      }
      return result
    } finally {
      setIsLoading(false)
    }
  }

  const progress = project.progress || 0
  const canComplete = project.totalTasks === 0 || progress === 100

  if (isEditing) {
    return (
      <ProjectEditForm
        project={project}
        onSave={handleUpdate}
        onCancel={() => setIsEditing(false)}
        isLoading={isLoading}
      />
    )
  }

  return (
    <div className={`bg-white rounded-lg border p-6 hover:shadow-md transition-shadow ${
      project.status === "completed" ? "opacity-75" : ""
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          {/* Project Header */}
          <div className="flex items-center space-x-3 mb-3">
            <h3 className={`text-lg font-semibold text-gray-900 ${
              project.status === "completed" ? "line-through" : ""
            }`}>
              {project.name}
            </h3>
            
            {/* Status Badge */}
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              getProjectStatusColor(project.status)
            }`}>
              {getProjectStatusLabel(project.status)}
            </span>

            {/* Completion Button */}
            {project.status !== "archived" && (
              <button
                onClick={handleComplete}
                disabled={isLoading || (!canComplete && project.status !== "completed")}
                className={`flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                  project.status === "completed"
                    ? "bg-green-500 border-green-500 text-white"
                    : canComplete
                    ? "border-gray-300 hover:border-green-400"
                    : "border-gray-200 cursor-not-allowed opacity-50"
                } ${isLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                title={
                  project.status === "completed" 
                    ? "Reopen project" 
                    : canComplete 
                    ? "Mark project complete" 
                    : "Complete all tasks first"
                }
              >
                {project.status === "completed" && (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            )}
          </div>

          {/* Description */}
          {project.description && (
            <p className={`text-gray-600 mb-4 ${
              project.status === "completed" ? "line-through" : ""
            }`}>
              {project.description}
            </p>
          )}

          {/* Outcome */}
          {project.outcome && (
            <div className="mb-4">
              <span className="text-sm font-medium text-gray-700">Outcome: </span>
              <span className={`text-sm text-gray-600 ${
                project.status === "completed" ? "line-through" : ""
              }`}>
                {project.outcome}
              </span>
            </div>
          )}

          {/* Progress Bar */}
          {(project.totalTasks || 0) > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                <span>Progress</span>
                <span>{project.completedTasks || 0} of {project.totalTasks || 0} tasks completed</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    progress === 100 ? "bg-green-500" : progress > 0 ? "bg-blue-500" : "bg-gray-300"
                  }`}
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <div className="text-xs text-gray-500 mt-1">{progress}% complete</div>
            </div>
          )}

          {/* Next Action */}
          {project.nextAction && project.status === "active" && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <div className="text-sm font-medium text-blue-900 mb-1">Next Action:</div>
              <div className="text-sm text-blue-800">{project.nextAction.title}</div>
              {project.nextAction.dueDate && (
                <div className="text-xs text-blue-600 mt-1">
                  Due: {new Date(project.nextAction.dueDate).toLocaleDateString()}
                </div>
              )}
            </div>
          )}

          {/* Metadata */}
          <div className="flex items-center space-x-4 text-xs text-gray-500">
            {/* Area */}
            {project.area && (
              <span className="flex items-center">
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                {project.area.name}
              </span>
            )}

            {/* Created Date */}
            <span>
              Created {new Date(project.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2 ml-4">
          <button
            onClick={() => setIsEditing(true)}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Edit project"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          
          <div className="relative">
            <button
              onClick={() => setShowDeleteOptions(!showDeleteOptions)}
              disabled={isLoading}
              className="text-gray-400 hover:text-red-600 transition-colors"
              title="Delete project"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>

            {/* Delete Options Dropdown */}
            {showDeleteOptions && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border z-10">
                <div className="py-1">
                  <button
                    onClick={() => handleDelete("unassign")}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Delete project, keep tasks
                  </button>
                  <button
                    onClick={() => handleDelete("delete")}
                    className="block w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                  >
                    Delete project and tasks
                  </button>
                  <button
                    onClick={() => setShowDeleteOptions(false)}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-500 hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}