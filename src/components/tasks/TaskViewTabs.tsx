"use client"

import React from "react"
import { TaskFilters } from "@/types/task"

interface TaskViewTabsProps {
  activeView: string
  onViewChange: (view: string, filters: Partial<TaskFilters>) => void
  taskCounts?: {
    all: number
    today: number
    overdue: number
    upcoming: number
    noDueDate: number
    focus: number
  }
  showAdditionalFilters?: boolean
  onToggleAdditionalFilters?: () => void
  filters?: TaskFilters
}

export const TaskViewTabs = React.memo(function TaskViewTabs({ 
  activeView, 
  onViewChange, 
  taskCounts, 
  showAdditionalFilters = false, 
  onToggleAdditionalFilters,
  filters = {}
}: TaskViewTabsProps) {
  // Check if any additional filters are active (excluding dueDate which is handled by tabs)
  const hasActiveAdditionalFilters = Object.entries(filters).some(([key, value]) => 
    key !== 'dueDate' && value !== undefined && value !== null && value !== ""
  )
  const views = [
    {
      id: "all",
      label: "All Tasks",
      filters: { status: "active" as const },
      count: taskCounts?.all,
    },
    {
      id: "focus",
      label: "Focus",
      filters: { status: "active" as const, dueDate: "focus" as const },
      count: taskCounts?.focus,
      tooltip: "Shows overdue and today's tasks for immediate attention",
    },
    {
      id: "today",
      label: "Today",
      filters: { status: "active" as const, dueDate: "today" as const },
      count: taskCounts?.today,
    },
    {
      id: "overdue",
      label: "Overdue",
      filters: { status: "active" as const, dueDate: "overdue" as const },
      count: taskCounts?.overdue,
    },
    {
      id: "upcoming",
      label: "Upcoming",
      filters: { status: "active" as const, dueDate: "upcoming" as const },
      count: taskCounts?.upcoming,
    },
    {
      id: "no-due-date",
      label: "No Due Date",
      filters: { status: "active" as const, dueDate: "no-due-date" as const },
      count: taskCounts?.noDueDate,
    },
  ]

  return (
    <div className="border-b border-gray-200">
      <div className="flex justify-between items-center">
        <nav className="-mb-px flex space-x-4 sm:space-x-8 overflow-x-auto" aria-label="Tabs">
          {views.map((view) => (
            <button
              key={view.id}
              onClick={() => onViewChange(view.id, view.filters)}
              className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-xs sm:text-sm relative flex-shrink-0 ${
                activeView === view.id
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
              title={view.tooltip}
            >
              {view.label}
              {view.count !== undefined && (
                <span className={`ml-1 sm:ml-2 py-0.5 px-1 sm:px-2 rounded-full text-xs ${
                  activeView === view.id
                    ? "bg-blue-100 text-blue-600"
                    : "bg-gray-100 text-gray-900"
                }`}>
                  {view.count}
                </span>
              )}
            </button>
          ))}
        </nav>
        
        {/* Filter Settings Icon */}
        {onToggleAdditionalFilters && (
          <button
            onClick={onToggleAdditionalFilters}
            className={`p-2 rounded-md text-sm font-medium transition-colors relative flex-shrink-0 ${
              showAdditionalFilters
                ? "bg-blue-100 text-blue-600"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            }`}
            title="Additional Filters"
            aria-label="Toggle additional filters"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
            </svg>
            {/* Active filter indicator */}
            {hasActiveAdditionalFilters && (
              <span className="absolute -top-1 -right-1 h-3 w-3 bg-blue-600 rounded-full"></span>
            )}
          </button>
        )}
      </div>
    </div>
  )
})