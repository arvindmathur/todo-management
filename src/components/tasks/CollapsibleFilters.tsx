"use client"

import React from "react"
import { TaskStatus, TaskPriority, TaskFilters } from "@/types/task"

interface CollapsibleFiltersProps {
  isOpen: boolean
  filters: TaskFilters
  onFiltersChange: (filters: Partial<TaskFilters>) => void
  onClearFilters: () => void
  isLoading?: boolean
}

export const CollapsibleFilters = React.memo(function CollapsibleFilters({ 
  isOpen, 
  filters, 
  onFiltersChange, 
  onClearFilters, 
  isLoading 
}: CollapsibleFiltersProps) {
  const hasActiveFilters = Object.entries(filters).some(([key, value]) => 
    key !== 'dueDate' && value !== undefined && value !== null && value !== ""
  )

  if (!isOpen) return null

  return (
    <div className="bg-white rounded-lg border mb-4 overflow-hidden transition-all duration-300 ease-in-out animate-in slide-in-from-top-2">
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900">Additional Filters</h3>
          {hasActiveFilters && (
            <button
              onClick={onClearFilters}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              Clear all
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Status Filter */}
          <div>
            <label htmlFor="status-filter" className="block text-xs font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              id="status-filter"
              value={filters.status || ""}
              onChange={(e) => onFiltersChange({ 
                status: e.target.value as TaskStatus || undefined 
              })}
              className="block w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              disabled={isLoading}
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <label htmlFor="priority-filter" className="block text-xs font-medium text-gray-700 mb-1">
              Priority
            </label>
            <select
              id="priority-filter"
              value={filters.priority || ""}
              onChange={(e) => onFiltersChange({ 
                priority: e.target.value as TaskPriority || undefined 
              })}
              className="block w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              disabled={isLoading}
            >
              <option value="">All priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Context Filter */}
          <div>
            <label htmlFor="context-filter" className="block text-xs font-medium text-gray-700 mb-1">
              Context
            </label>
            <select
              id="context-filter"
              value={filters.contextId || ""}
              onChange={(e) => onFiltersChange({ 
                contextId: e.target.value || undefined 
              })}
              className="block w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              disabled={isLoading}
            >
              <option value="">All contexts</option>
              <option value="phone">@phone</option>
              <option value="computer">@computer</option>
              <option value="errands">@errands</option>
              <option value="home">@home</option>
              <option value="office">@office</option>
            </select>
          </div>

          {/* Area Filter */}
          <div>
            <label htmlFor="area-filter" className="block text-xs font-medium text-gray-700 mb-1">
              Area
            </label>
            <select
              id="area-filter"
              value={filters.areaId || ""}
              onChange={(e) => onFiltersChange({ 
                areaId: e.target.value || undefined 
              })}
              className="block w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              disabled={isLoading}
            >
              <option value="">All areas</option>
              <option value="work">Work</option>
              <option value="personal">Personal</option>
              <option value="health">Health</option>
              <option value="learning">Learning</option>
            </select>
          </div>
        </div>

        {/* Search Filter */}
        <div>
          <label htmlFor="search-filter" className="block text-xs font-medium text-gray-700 mb-1">
            Search
          </label>
          <div className="relative">
            <input
              type="text"
              id="search-filter"
              value={filters.search || ""}
              onChange={(e) => onFiltersChange({ search: e.target.value || undefined })}
              placeholder="Search tasks..."
              className="block w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 pl-8"
              disabled={isLoading}
            />
            <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
              {isLoading && filters.search ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              ) : (
                <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})