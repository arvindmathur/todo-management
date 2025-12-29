"use client"

import { useState, useRef, useEffect } from "react"
import { Task, TaskPriority } from "@/types/task"
import { TaskEditForm } from "./TaskEditForm"
import { LoadingButton } from "@/components/feedback"
import { useErrorHandling } from "@/hooks/useErrorHandling"
import { useLoadingState } from "@/hooks/useLoadingState"
import { useSuccessToast } from "@/components/feedback"
import { useUserPreferences } from "@/hooks/useUserPreferences"
import { formatDate, getDateInputValue, createDateInTimezone, isOverdue as isDateOverdue } from "@/lib/timezone"

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

const priorityOrder: TaskPriority[] = ["low", "medium", "high", "urgent"]

export function TaskItem({
  task,
  onUpdate,
  onDelete,
  onComplete,
  onReopen,
}: TaskItemProps) {
  const { preferencesData } = useUserPreferences()
  const userTimezone = preferencesData?.preferences?.timezone
  const dateFormat = preferencesData?.preferences?.dateFormat || "MM/DD/YYYY"
  
  const [isEditing, setIsEditing] = useState(false)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [isEditingDueDate, setIsEditingDueDate] = useState(false)
  const [isEditingPriority, setIsEditingPriority] = useState(false)
  const [editingTitle, setEditingTitle] = useState(task.title)
  const [editingDueDate, setEditingDueDate] = useState(
    task.dueDate ? getDateInputValue(new Date(task.dueDate), userTimezone) : ""
  )
  const [isSavingTitle, setIsSavingTitle] = useState(false)
  const [isSavingDueDate, setIsSavingDueDate] = useState(false)
  const [isSavingPriority, setIsSavingPriority] = useState(false)
  
  const titleInputRef = useRef<HTMLInputElement>(null)
  const dueDateInputRef = useRef<HTMLInputElement>(null)
  const priorityDropdownRef = useRef<HTMLDivElement>(null)
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null)
  
  const { handleError } = useErrorHandling()
  const { isLoading, startLoading, stopLoading } = useLoadingState()
  const showSuccess = useSuccessToast()

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus()
      titleInputRef.current.select()
    }
  }, [isEditingTitle])

  useEffect(() => {
    if (isEditingDueDate && dueDateInputRef.current) {
      dueDateInputRef.current.focus()
    }
  }, [isEditingDueDate])

  // Close priority dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (priorityDropdownRef.current && !priorityDropdownRef.current.contains(event.target as Node)) {
        setIsEditingPriority(false)
      }
    }

    if (isEditingPriority) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isEditingPriority])

  // Reset editing values when task changes
  useEffect(() => {
    setEditingTitle(task.title)
    setEditingDueDate(task.dueDate ? getDateInputValue(new Date(task.dueDate), userTimezone) : "")
  }, [task.title, task.dueDate, userTimezone])

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

  // Handle title editing
  const handleTitleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isEditingTitle && !isLoading && task.status !== "completed") {
      setIsEditingTitle(true)
    }
  }

  const handleTitleSave = async () => {
    if (editingTitle.trim() === task.title || !editingTitle.trim()) {
      setIsEditingTitle(false)
      setEditingTitle(task.title)
      return
    }

    setIsSavingTitle(true)
    try {
      const result = await onUpdate(task.id, { title: editingTitle.trim() })
      if (result.success) {
        setIsEditingTitle(false)
        showSuccess("Title Updated", "Task title has been updated")
      } else {
        setEditingTitle(task.title)
      }
    } catch (error) {
      await handleError(error, "Title update")
      setEditingTitle(task.title)
    } finally {
      setIsSavingTitle(false)
    }
  }

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleTitleSave()
    } else if (e.key === "Escape") {
      setIsEditingTitle(false)
      setEditingTitle(task.title)
    }
  }

  const handleTitleBlur = () => {
    handleTitleSave()
  }

  // Handle due date editing
  const handleDueDateClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isEditingDueDate && !isLoading && task.status !== "completed") {
      setIsEditingDueDate(true)
    }
  }

  const handleDueDateSave = async () => {
    if (!editingDueDate) {
      // Clear due date
      const currentDueDate = task.dueDate ? new Date(task.dueDate) : null
      
      if (currentDueDate) {
        setIsSavingDueDate(true)
        try {
          const result = await onUpdate(task.id, { dueDate: null })
          if (result.success) {
            setIsEditingDueDate(false)
            showSuccess("Due Date Cleared", "Task due date has been cleared")
          } else {
            setEditingDueDate(task.dueDate ? getDateInputValue(new Date(task.dueDate), userTimezone) : "")
          }
        } catch (error) {
          await handleError(error, "Due date update")
          setEditingDueDate(task.dueDate ? getDateInputValue(new Date(task.dueDate), userTimezone) : "")
        } finally {
          setIsSavingDueDate(false)
        }
      } else {
        setIsEditingDueDate(false)
      }
      return
    }

    // Create date in user's timezone to avoid timezone conversion issues
    const newDueDate = createDateInTimezone(editingDueDate, userTimezone)
    const currentDueDate = task.dueDate ? new Date(task.dueDate) : null
    
    // Compare dates (ignore time)
    const isSameDate = newDueDate && currentDueDate 
      ? newDueDate.toDateString() === currentDueDate.toDateString()
      : newDueDate === currentDueDate

    if (isSameDate) {
      setIsEditingDueDate(false)
      return
    }

    setIsSavingDueDate(true)
    try {
      const result = await onUpdate(task.id, { dueDate: newDueDate })
      if (result.success) {
        setIsEditingDueDate(false)
        showSuccess("Due Date Updated", "Task due date has been updated")
      } else {
        setEditingDueDate(task.dueDate ? getDateInputValue(new Date(task.dueDate), userTimezone) : "")
      }
    } catch (error) {
      await handleError(error, "Due date update")
      setEditingDueDate(task.dueDate ? getDateInputValue(new Date(task.dueDate), userTimezone) : "")
    } finally {
      setIsSavingDueDate(false)
    }
  }

  const handleDueDateKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleDueDateSave()
    } else if (e.key === "Escape") {
      setIsEditingDueDate(false)
      setEditingDueDate(task.dueDate ? getDateInputValue(new Date(task.dueDate), userTimezone) : "")
    }
  }

  const handleDueDateBlur = () => {
    handleDueDateSave()
  }

  // Quick date setters
  const setQuickDate = async (days: number) => {
    const date = new Date()
    date.setDate(date.getDate() + days)
    const dateString = getDateInputValue(date, userTimezone)
    
    // Create date in user's timezone to avoid timezone conversion issues
    const newDueDate = createDateInTimezone(dateString, userTimezone)
    
    setIsSavingDueDate(true)
    try {
      const result = await onUpdate(task.id, { dueDate: newDueDate })
      if (result.success) {
        setIsEditingDueDate(false)
        showSuccess("Due Date Updated", "Task due date has been updated")
      } else {
        // Reset to current value on failure
        setEditingDueDate(task.dueDate ? getDateInputValue(new Date(task.dueDate), userTimezone) : "")
      }
    } catch (error) {
      await handleError(error, "Due date update")
      // Reset to current value on error
      setEditingDueDate(task.dueDate ? getDateInputValue(new Date(task.dueDate), userTimezone) : "")
    } finally {
      setIsSavingDueDate(false)
    }
  }

  const clearDueDate = async () => {
    setIsSavingDueDate(true)
    try {
      const result = await onUpdate(task.id, { dueDate: null })
      if (result.success) {
        setIsEditingDueDate(false)
        showSuccess("Due Date Cleared", "Task due date has been cleared")
      }
    } catch (error) {
      await handleError(error, "Due date update")
    } finally {
      setIsSavingDueDate(false)
    }
  }

  // Handle priority editing
  const handlePriorityClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isLoading || task.status === "completed" || isSavingPriority) return
    setIsEditingPriority(!isEditingPriority)
  }

  const handlePrioritySelect = async (newPriority: TaskPriority) => {
    if (newPriority === task.priority) {
      setIsEditingPriority(false)
      return
    }

    setIsSavingPriority(true)
    try {
      const result = await onUpdate(task.id, { priority: newPriority })
      if (result.success) {
        setIsEditingPriority(false)
        showSuccess("Priority Updated", `Priority changed to ${priorityLabels[newPriority]}`)
      }
    } catch (error) {
      await handleError(error, "Priority update")
    } finally {
      setIsSavingPriority(false)
    }
  }

  // Handle long press for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    longPressTimerRef.current = setTimeout(() => {
      if (!isEditingTitle && !isLoading && task.status !== "completed") {
        setIsEditingTitle(true)
        // Add haptic feedback if supported
        if (navigator.vibrate) {
          navigator.vibrate(50)
        }
      }
    }, 500) // 500ms long press
  }

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }

  const formatDueDate = (date: Date) => {
    const now = new Date()
    const dueDate = new Date(date)
    
    // Use timezone-aware date comparison
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const taskDueDate = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate())
    
    const diffTime = taskDueDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return "Today"
    if (diffDays === 1) return "Tomorrow"
    if (diffDays === -1) return "Yesterday"
    if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`
    if (diffDays <= 7) return `In ${diffDays} days`
    
    // Use user's preferred date format
    return formatDate(date, { dateFormat, timezone: userTimezone })
  }

  const isOverdue = (() => {
    if (!task.dueDate || task.status === "completed") return false
    
    const dueDate = new Date(task.dueDate)
    
    // Use timezone-aware overdue check
    return isDateOverdue(dueDate, userTimezone)
  })()

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
    <div className={`bg-white rounded-lg border p-2 hover:shadow-md transition-shadow ${
      task.status === "completed" ? "opacity-75" : ""
    } ${
      isOverdue ? "border-red-200 bg-red-50" : ""
    }`}>
      <div className="flex items-start space-x-2">
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
          {/* First row: Title (left) and Actions (right) */}
          <div className="flex items-start justify-between mb-1">
            <div className="flex-1 min-w-0 pr-2">
              {/* Editable task title */}
              {isEditingTitle ? (
                <div className="relative">
                  <input
                    ref={titleInputRef}
                    type="text"
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onKeyDown={handleTitleKeyDown}
                    onBlur={handleTitleBlur}
                    disabled={isSavingTitle}
                    className={`w-full text-sm font-medium bg-white border border-blue-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      isSavingTitle ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                    placeholder="Enter task title..."
                  />
                  {isSavingTitle && (
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-start">
                  <h3 
                    className={`text-sm font-medium cursor-pointer hover:bg-gray-50 rounded px-2 py-1 -mx-2 -my-1 transition-colors line-clamp-2 ${
                      task.status === "completed" 
                        ? "line-through text-gray-500" 
                        : "text-gray-900 hover:text-blue-600"
                    } ${
                      task.status !== "completed" ? "hover:shadow-sm" : ""
                    }`}
                    onClick={handleTitleClick}
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                    title={task.status !== "completed" ? "Click to edit title" : ""}
                    style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      wordBreak: 'break-word'
                    }}
                  >
                    {task.title}
                  </h3>
                  {isOverdue && (
                    <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 flex-shrink-0">
                      Overdue
                    </span>
                  )}
                </div>
              )}
              
              {/* Description on separate line if exists */}
              {task.description && (
                <p className={`mt-1 text-sm text-gray-600 line-clamp-1 ${
                  task.status === "completed" ? "line-through" : ""
                }`}
                style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 1,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}>
                  {task.description}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2 flex-shrink-0">
              <button
                onClick={() => setIsEditing(true)}
                disabled={isLoading}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                title="Edit all fields"
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

          {/* Second row: Other metadata (left) and Priority + Due Date (right) */}
          <div className="flex items-center justify-between text-xs text-gray-500">
            {/* Left side: Project, Context, Area, Tags */}
            <div className="flex items-center space-x-3 min-w-0 flex-1">
              {/* Project */}
              {task.project && (
                <span className="flex items-center truncate">
                  <svg className="w-3 h-3 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <span className="truncate">{task.project.name}</span>
                </span>
              )}

              {/* Context */}
              {task.context && (
                <span className="flex items-center truncate">
                  <svg className="w-3 h-3 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="truncate">{task.context.name}</span>
                </span>
              )}

              {/* Area */}
              {task.area && (
                <span className="flex items-center truncate">
                  <svg className="w-3 h-3 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  <span className="truncate">{task.area.name}</span>
                </span>
              )}

              {/* Tags */}
              {task.tags.length > 0 && (
                <div className="flex items-center space-x-1 min-w-0">
                  {task.tags.slice(0, 2).map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 truncate"
                    >
                      #{tag}
                    </span>
                  ))}
                  {task.tags.length > 2 && (
                    <span className="text-xs text-gray-400">+{task.tags.length - 2}</span>
                  )}
                </div>
              )}
            </div>

            {/* Right side: Priority and Due Date */}
            <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
              {/* Priority */}
              <div className="relative" ref={priorityDropdownRef}>
                <span 
                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium cursor-pointer hover:shadow-md transition-all ${
                    priorityColors[task.priority]
                  } ${
                    task.status !== "completed" ? "hover:scale-105" : "cursor-default"
                  } ${
                    isSavingPriority ? "opacity-50" : ""
                  }`}
                  onClick={handlePriorityClick}
                  title={task.status !== "completed" ? "Click to change priority" : ""}
                >
                  {isSavingPriority ? (
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-1"></div>
                  ) : null}
                  {priorityLabels[task.priority]}
                  {task.status !== "completed" && !isSavingPriority && (
                    <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </span>

                {/* Priority Dropdown */}
                {isEditingPriority && task.status !== "completed" && (
                  <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[100px]">
                    {priorityOrder.map((priority) => (
                      <button
                        key={priority}
                        onClick={() => handlePrioritySelect(priority)}
                        disabled={isSavingPriority}
                        className={`w-full text-left px-3 py-2 text-xs font-medium hover:bg-gray-50 transition-colors first:rounded-t-md last:rounded-b-md ${
                          priority === task.priority ? 'bg-blue-50' : ''
                        } ${
                          isSavingPriority ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${priorityColors[priority]}`}>
                          {priorityLabels[priority]}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Due Date */}
              {isEditingDueDate ? (
                <div className="flex items-center space-x-1">
                  <div className="relative">
                    <input
                      ref={dueDateInputRef}
                      type="date"
                      value={editingDueDate}
                      onChange={(e) => setEditingDueDate(e.target.value)}
                      onKeyDown={handleDueDateKeyDown}
                      onBlur={handleDueDateBlur}
                      disabled={isSavingDueDate}
                      className={`text-xs border border-blue-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        isSavingDueDate ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    />
                    {isSavingDueDate && (
                      <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                      </div>
                    )}
                  </div>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => setQuickDate(0)}
                      disabled={isSavingDueDate}
                      className="px-1 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition-colors"
                    >
                      Today
                    </button>
                    <button
                      onClick={() => setQuickDate(1)}
                      disabled={isSavingDueDate}
                      className="px-1 py-1 text-xs bg-green-100 text-green-800 rounded hover:bg-green-200 transition-colors"
                    >
                      Tomorrow
                    </button>
                    <button
                      onClick={clearDueDate}
                      disabled={isSavingDueDate}
                      className="px-1 py-1 text-xs bg-gray-100 text-gray-800 rounded hover:bg-gray-200 transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              ) : (
                task.dueDate ? (
                  <span 
                    className={`flex items-center cursor-pointer hover:bg-gray-50 rounded px-2 py-1 -mx-2 -my-1 transition-colors ${
                      isOverdue ? "text-red-600 font-medium" : ""
                    } ${
                      task.status !== "completed" ? "hover:text-blue-600 hover:shadow-sm" : ""
                    }`}
                    onClick={handleDueDateClick}
                    title={task.status !== "completed" ? "Click to edit due date" : ""}
                  >
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {formatDueDate(new Date(task.dueDate))}
                  </span>
                ) : (
                  task.status !== "completed" && (
                    <span 
                      className="flex items-center cursor-pointer hover:bg-gray-50 rounded px-2 py-1 -mx-2 -my-1 transition-colors text-gray-400 hover:text-blue-600 hover:shadow-sm"
                      onClick={handleDueDateClick}
                      title="Click to set due date"
                    >
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Set due date
                    </span>
                  )
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}