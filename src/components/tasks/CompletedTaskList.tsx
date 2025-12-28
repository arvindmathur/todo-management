"use client"

import { useState } from "react"
import { useCompletedTasks } from "@/hooks/useCompletedTasks"
import { CompletedTaskItem } from "./CompletedTaskItem"
import { CompletedTaskFilters } from "./CompletedTaskFilters"
import { CompletedTaskStats } from "./CompletedTaskStats"
import { BulkDeleteModal } from "./BulkDeleteModal"
import { CompletedTaskFilters as FilterType } from "@/types/completedTask"

export function CompletedTaskList() {
  const {
    tasks,
    pagination,
    loading,
    error,
    filters,
    updateFilters,
    changePage,
    bulkDeleteTasks,
    reopenTask,
  } = useCompletedTasks()

  const [selectedTasks, setSelectedTasks] = useState<string[]>([])
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false)
  const [showStats, setShowStats] = useState(false)

  const handleSelectTask = (taskId: string, selected: boolean) => {
    if (selected) {
      setSelectedTasks(prev => [...prev, taskId])
    } else {
      setSelectedTasks(prev => prev.filter(id => id !== taskId))
    }
  }

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedTasks(tasks.map(task => task.id))
    } else {
      setSelectedTasks([])
    }
  }

  const handleBulkDelete = async (olderThanDays?: number) => {
    try {
      if (selectedTasks.length > 0) {
        await bulkDeleteTasks({ taskIds: selectedTasks })
        setSelectedTasks([])
      } else if (olderThanDays) {
        await bulkDeleteTasks({ olderThanDays })
      }
      setShowBulkDeleteModal(false)
    } catch (err) {
      console.error("Bulk delete error:", err)
    }
  }

  const handleReopenTask = async (taskId: string) => {
    try {
      await reopenTask(taskId)
      setSelectedTasks(prev => prev.filter(id => id !== taskId))
    } catch (err) {
      console.error("Reopen task error:", err)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading completed tasks...</span>
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
            <h3 className="text-sm font-medium text-red-800">Error loading completed tasks</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Completed Tasks</h2>
          <p className="text-sm text-gray-600 mt-1">
            View and manage your completed tasks
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowStats(!showStats)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            {showStats ? "Hide Stats" : "Show Stats"}
          </button>
          {selectedTasks.length > 0 && (
            <button
              onClick={() => setShowBulkDeleteModal(true)}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete Selected ({selectedTasks.length})
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      {showStats && <CompletedTaskStats />}

      {/* Filters */}
      <CompletedTaskFilters
        filters={filters}
        onFiltersChange={updateFilters}
        onBulkDelete={() => setShowBulkDeleteModal(true)}
      />

      {/* Task List */}
      <div className="bg-white shadow rounded-lg">
        {tasks.length === 0 ? (
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
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No completed tasks</h3>
            <p className="mt-1 text-sm text-gray-500">
              {filters.archived 
                ? "No archived tasks found matching your filters."
                : "No completed tasks found matching your filters."
              }
            </p>
          </div>
        ) : (
          <>
            {/* Select All Header */}
            <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedTasks.length === tasks.length && tasks.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-3 text-sm font-medium text-gray-700">
                  Select all ({tasks.length} tasks)
                </label>
                {pagination && (
                  <span className="ml-auto text-sm text-gray-500">
                    Showing {((pagination.page - 1) * pagination.limit) + 1} to{" "}
                    {Math.min(pagination.page * pagination.limit, pagination.totalCount)} of{" "}
                    {pagination.totalCount} tasks
                  </span>
                )}
              </div>
            </div>

            {/* Task Items */}
            <div className="divide-y divide-gray-200">
              {tasks.map((task) => (
                <CompletedTaskItem
                  key={task.id}
                  task={task}
                  selected={selectedTasks.includes(task.id)}
                  onSelect={(selected) => handleSelectTask(task.id, selected)}
                  onReopen={() => handleReopenTask(task.id)}
                />
              ))}
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Page {pagination.page} of {pagination.totalPages}
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => changePage(pagination.page - 1)}
                      disabled={!pagination.hasPrev}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => changePage(pagination.page + 1)}
                      disabled={!pagination.hasNext}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Bulk Delete Modal */}
      {showBulkDeleteModal && (
        <BulkDeleteModal
          selectedCount={selectedTasks.length}
          onConfirm={handleBulkDelete}
          onCancel={() => setShowBulkDeleteModal(false)}
        />
      )}
    </div>
  )
}