"use client"

import { useState, useRef, useEffect } from "react"
import { TaskPriority, CreateTaskRequest } from "@/types/task"

interface InlineTaskCreatorProps {
  onTaskCreate: (taskData: CreateTaskRequest) => Promise<any>
  isLoading: boolean
  onTaskCreated?: () => void
}

export function InlineTaskCreator({ onTaskCreate, isLoading, onTaskCreated }: InlineTaskCreatorProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState("")
  const [priority, setPriority] = useState<TaskPriority>("medium")
  const [dueDate, setDueDate] = useState<string>("")
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const titleInputRef = useRef<HTMLInputElement>(null)

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && titleInputRef.current) {
      titleInputRef.current.focus()
    }
  }, [isEditing])

  const handleTitleClick = () => {
    if (!isEditing) {
      setIsEditing(true)
    }
  }

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value)
  }

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleCreateTask()
    } else if (e.key === "Escape") {
      handleCancel()
    } else if (e.key === "Tab" && !e.shiftKey) {
      // Allow tabbing to priority selector
      e.preventDefault()
      const prioritySelect = document.getElementById("inline-priority")
      prioritySelect?.focus()
    }
  }

  const handleTitleBlur = () => {
    if (title.trim()) {
      handleCreateTask()
    } else {
      handleCancel()
    }
  }

  const handleCreateTask = async () => {
    if (!title.trim() || isCreating) return

    setIsCreating(true)
    setError(null)
    
    try {
      const taskData: CreateTaskRequest = {
        title: title.trim(),
        priority,
        dueDate: dueDate || undefined,
      }

      const result = await onTaskCreate(taskData)
      if (result.success) {
        // Reset form
        setTitle("")
        setPriority("medium")
        setDueDate("")
        setIsEditing(false)
        setError(null)
        onTaskCreated?.()
      } else {
        setError(result.error || "Failed to create task")
        // Keep the form in editing state so user can retry
      }
    } catch (error) {
      console.error("Failed to create task:", error)
      setError("Failed to create task. Please try again.")
      // Keep the form in editing state so user can retry
    } finally {
      setIsCreating(false)
    }
  }

  const handleCancel = () => {
    setTitle("")
    setIsEditing(false)
    setError(null)
  }

  const handlePriorityClick = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  const handleDueDateClick = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  const formatDueDate = (dateStr: string) => {
    if (!dateStr) return ""
    const date = new Date(dateStr)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (date.toDateString() === today.toDateString()) {
      return "Today"
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return "Tomorrow"
    } else {
      return date.toLocaleDateString()
    }
  }

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800"
      case "high":
        return "bg-orange-100 text-orange-800"
      case "medium":
        return "bg-yellow-100 text-yellow-800"
      case "low":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="space-y-2">
      <div className="bg-white rounded-lg border border-dashed border-gray-300 hover:border-gray-400 transition-colors">
        <div className="p-3 sm:p-4">
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Checkbox placeholder */}
            <div className="w-4 h-4 border-2 border-gray-300 rounded flex-shrink-0"></div>

            {/* Title field */}
            <div className="flex-1 min-w-0">
              {isEditing ? (
                <input
                  ref={titleInputRef}
                  type="text"
                  value={title}
                  onChange={handleTitleChange}
                  onKeyDown={handleTitleKeyDown}
                  onBlur={handleTitleBlur}
                  className="w-full text-sm border-none outline-none bg-transparent"
                  placeholder="Enter task title..."
                  disabled={isCreating}
                />
              ) : (
                <button
                  onClick={handleTitleClick}
                  className="w-full text-left text-sm text-gray-500 hover:text-gray-700 transition-colors"
                  disabled={isLoading}
                >
                  Click to add New Task
                </button>
              )}
            </div>

            {/* Priority selector */}
            <div onClick={handlePriorityClick} className="flex-shrink-0">
              <label htmlFor="inline-priority" className="sr-only">Priority</label>
              <select
                id="inline-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className={`text-xs px-1 sm:px-2 py-1 rounded-full border-none outline-none cursor-pointer ${getPriorityColor(priority)}`}
                disabled={isLoading || isCreating}
                aria-label="Task priority"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            {/* Due date selector */}
            <div onClick={handleDueDateClick} className="min-w-[80px] sm:min-w-[100px] flex-shrink-0">
              {dueDate ? (
                <div className="flex items-center space-x-1">
                  <span className="text-xs text-gray-600 truncate">{formatDueDate(dueDate)}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setDueDate("")
                    }}
                    className="text-xs text-gray-400 hover:text-gray-600 flex-shrink-0"
                    disabled={isLoading || isCreating}
                    aria-label="Clear due date"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <>
                  <label htmlFor="inline-due-date" className="sr-only">Due date</label>
                  <input
                    id="inline-due-date"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="text-xs text-gray-500 border-none outline-none bg-transparent cursor-pointer w-full"
                    disabled={isLoading || isCreating}
                    aria-label="Task due date"
                  />
                </>
              )}
            </div>

            {/* Loading indicator */}
            {isCreating && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 flex-shrink-0"></div>
            )}
          </div>
        </div>
      </div>
      
      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-2">
          <div className="flex items-center">
            <svg className="h-4 w-4 text-red-400 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="text-sm text-red-700">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-600"
              aria-label="Dismiss error"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  )
}