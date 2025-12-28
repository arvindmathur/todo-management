"use client"

import { useState } from "react"
import { Task, TaskPriority } from "@/types/task"
import { TaskEditForm } from "./TaskEditForm"
import { LoadingButton } from "@/components/feedback"
import { useErrorHandling } from "@/hooks/useErrorHandling"
import { useLoadingState } from "@/hooks/useLoadingState"
import { useSuccessToast } from "@/components/feedback"

interface TaskItemProps {
  task: Task
  onUpdate: (taskId: string, updates: any) => Promise<any>
  onDelete: (taskId: string) => Promise<any>
  onComplete: (taskId: string) => Promise<any>
  onReopen: (taskId: string) => Promise<any>
}

const priorityColors = {
  low: "bg-gray-100 text-gray-800",
  medium: "bg-blue-100 text-blue-800",
  high: "bg-yellow-100 text-yellow-800",
  urgent: "bg-red-100 text-red-800",
}

const priorityLabels = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
}

export function TaskItem({
  task,
  onUpdate,
  onDelete,
  onComplete,
  onReopen,
}: TaskItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const { handleError } = useErrorHandling()
  const { isLoading, startLoading, stopLoading } = useLoadingState()
  const showSuccess = useSuccessToast()

  const handleComplete = async () => {
    startLoading()
    try {
      if (task.status === "completed") {
        await onReopen(task.id)
        showSuccess("Task Reopened", "Task has been marked as active")
      } else {
        await onComplete(task.id)
        showSuccess("Task Completed", "Great job! Task has been completed")
      }
    } catch (error) {
      await handleError(error, "Task completion")
    } finally {
      stopLoading()
    }
  }

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this task?")) {
      startLoading()
      try {
        await onDelete(task.id)
        showSuccess("Task Deleted", "Task has been permanently deleted")
      } catch (error) {
        await handleError(error, "Task deletion")
      } finally {
        stopLoading()
      }
    }
  }

  const handleUpdate = async (updates: any) => {
    startLoading()
    try {
      const result = await onUpdate(task.id, updates)
      if (result.success) {
        setIsEditing(false)
        showSuccess("Task Updated", "Task has been successfully updated")
      }
      return result
    } catch (error) {
      await handleError(error, "Task update")
      return { success: false }
    } finally {
      stopLoading()
    }
  }

  const formatDueDate = (date: Date) => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const taskDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    
    const diffTime = taskDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return "Today"
    if (diffDays === 1) return "Tomorrow"
    if (diffDays === -1) return "Yesterday"
    if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`
    if (diffDays <= 7) return `In ${diffDays} days`
    
    return date.toLocaleDateString()
  }

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "completed"

  if (isEditing) {
    return (
      <TaskEditForm
        task={task}
        onSave={handleUpdate}
        onCancel={() => setIsEditing(false)}
        isLoading={isLoading}
      />
    )
  }

  return (
    <div className={`bg-white rounded-lg border p-4 hover:shadow-md transition-shadow ${
      task.status === "completed" ? "opacity-75" : ""
    } ${
      isOverdue ? "border-red-200 bg-red-50" : ""
    }`}>
      <div className="flex items-start space-x-3">
        {/* Completion checkbox */}
        <LoadingButton
          loading={isLoading}
          onClick={handleComplete}
          className={`mt-1 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
            task.status === "completed"
              ? "bg-green-500 border-green-500 text-white"
              : "border-gray-300 hover:border-green-400"
          }`}
        >
          {task.status === "completed" && (
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          )}
        </LoadingButton>

        {/* Task content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center">
                <h3 className={`text-sm font-medium text-gray-900 ${
                  task.status === "completed" ? "line-through" : ""
                }`}>
                  {task.title}
                </h3>
                {isOverdue && (
                  <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    Overdue
                  </span>
                )}
              </div>
              {task.description && (
                <p className={`mt-1 text-sm text-gray-600 ${
                  task.status === "completed" ? "line-through" : ""
                }`}>
                  {task.description}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2 ml-4">
              <button
                onClick={() => setIsEditing(true)}
                disabled={isLoading}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                title="Edit task"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                onClick={handleDelete}
                disabled={isLoading}
                className="text-gray-400 hover:text-red-600 transition-colors"
                title="Delete task"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>

          {/* Task metadata */}
          <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
            {/* Priority */}
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
              priorityColors[task.priority]
            }`}>
              {priorityLabels[task.priority]}
            </span>

            {/* Due date */}
            {task.dueDate && (
              <span className={`flex items-center ${
                isOverdue ? "text-red-600 font-medium" : ""
              }`}>
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {formatDueDate(new Date(task.dueDate))}
              </span>
            )}

            {/* Project */}
            {task.project && (
              <span className="flex items-center">
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                {task.project.name}
              </span>
            )}

            {/* Context */}
            {task.context && (
              <span className="flex items-center">
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {task.context.name}
              </span>
            )}

            {/* Area */}
            {task.area && (
              <span className="flex items-center">
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                {task.area.name}
              </span>
            )}

            {/* Tags */}
            {task.tags.length > 0 && (
              <div className="flex items-center space-x-1">
                {task.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}