"use client"

import { Task } from "@/types/task"
import { TaskItem } from "./TaskItem"
import { InlineTaskCreator } from "./InlineTaskCreator"

interface TaskListProps {
  tasks: Task[]
  loading: boolean
  error: string | null
  onTaskUpdate: (taskId: string, updates: any) => Promise<any>
  onTaskDelete: (taskId: string) => Promise<any>
  onTaskComplete: (taskId: string) => Promise<any>
  onTaskReopen: (taskId: string) => Promise<any>
  onTaskCreate?: (taskData: any) => Promise<any>
  onTaskCreated?: () => void
}

export function TaskList({
  tasks,
  loading,
  error,
  onTaskUpdate,
  onTaskDelete,
  onTaskComplete,
  onTaskReopen,
  onTaskCreate,
  onTaskCreated,
}: TaskListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading tasks...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading tasks</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (tasks.length === 0 && !loading) {
    return (
      <div className="space-y-2">
        {/* Inline Task Creator */}
        {onTaskCreate && (
          <InlineTaskCreator
            onTaskCreate={onTaskCreate}
            isLoading={loading}
            onTaskCreated={onTaskCreated}
          />
        )}
        
        <div className="text-center py-12">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No tasks</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating a new task above.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Inline Task Creator */}
      {onTaskCreate && (
        <InlineTaskCreator
          onTaskCreate={onTaskCreate}
          isLoading={loading}
          onTaskCreated={onTaskCreated}
        />
      )}
      
      {/* Task Items */}
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          onUpdate={onTaskUpdate}
          onDelete={onTaskDelete}
          onComplete={onTaskComplete}
          onReopen={onTaskReopen}
        />
      ))}
    </div>
  )
}