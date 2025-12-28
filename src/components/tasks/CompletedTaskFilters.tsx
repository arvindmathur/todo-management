"use client"

import { useState, useEffect } from "react"
import { useProjects } from "@/hooks/useProjects"
import { useContexts } from "@/hooks/useContexts"
import { useAreas } from "@/hooks/useAreas"
import { CompletedTaskFilters as FilterType } from "@/types/completedTask"

interface CompletedTaskFiltersProps {
  filters: FilterType
  onFiltersChange: (filters: Partial<FilterType>) => void
  onBulkDelete: () => void
}

export function CompletedTaskFilters({ 
  filters, 
  onFiltersChange, 
  onBulkDelete 
}: CompletedTaskFiltersProps) {
  const { projects } = useProjects()
  const { contexts } = useContexts()
  const { areas } = useAreas()
  
  const [searchInput, setSearchInput] = useState(filters.search || "")
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchInput !== filters.search) {
        onFiltersChange({ search: searchInput })
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchInput, filters.search, onFiltersChange])

  const handleDateRangeChange = (field: "dateFrom" | "dateTo", value: string) => {
    onFiltersChange({ [field]: value || undefined })
  }

  const clearFilters = () => {
    setSearchInput("")
    onFiltersChange({
      search: undefined,
      projectId: undefined,
      contextId: undefined,
      areaId: undefined,
      dateFrom: undefined,
      dateTo: undefined,
      archived: false
    })
  }

  const hasActiveFilters = !!(
    filters.search ||
    filters.projectId ||
    filters.contextId ||
    filters.areaId ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.archived
  )

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="space-y-4">
        {/* Search and Archive Toggle */}
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Search completed tasks..."
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="archived"
              checked={filters.archived || false}
              onChange={(e) => onFiltersChange({ archived: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="archived" className="text-sm font-medium text-gray-700">
              Show archived tasks (90+ days old)
            </label>
          </div>

          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className={`w-4 h-4 mr-2 transform transition-transform ${showAdvanced ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            Advanced
          </button>
        </div>

        {/* Advanced Filters */}
        {showAdvanced && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
            {/* Project Filter */}
            <div>
              <label htmlFor="project" className="block text-sm font-medium text-gray-700 mb-1">
                Project
              </label>
              <select
                id="project"
                value={filters.projectId || ""}
                onChange={(e) => onFiltersChange({ projectId: e.target.value || undefined })}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All projects</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Context Filter */}
            <div>
              <label htmlFor="context" className="block text-sm font-medium text-gray-700 mb-1">
                Context
              </label>
              <select
                id="context"
                value={filters.contextId || ""}
                onChange={(e) => onFiltersChange({ contextId: e.target.value || undefined })}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All contexts</option>
                {contexts.map((context) => (
                  <option key={context.id} value={context.id}>
                    {context.icon} {context.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Area Filter */}
            <div>
              <label htmlFor="area" className="block text-sm font-medium text-gray-700 mb-1">
                Area
              </label>
              <select
                id="area"
                value={filters.areaId || ""}
                onChange={(e) => onFiltersChange({ areaId: e.target.value || undefined })}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All areas</option>
                {areas.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Date From */}
            <div>
              <label htmlFor="dateFrom" className="block text-sm font-medium text-gray-700 mb-1">
                Completed From
              </label>
              <input
                type="date"
                id="dateFrom"
                value={filters.dateFrom || ""}
                onChange={(e) => handleDateRangeChange("dateFrom", e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Date To */}
            <div>
              <label htmlFor="dateTo" className="block text-sm font-medium text-gray-700 mb-1">
                Completed To
              </label>
              <input
                type="date"
                id="dateTo"
                value={filters.dateTo || ""}
                onChange={(e) => handleDateRangeChange("dateTo", e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <div className="flex items-center space-x-3">
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Clear all filters
              </button>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={onBulkDelete}
              className="inline-flex items-center px-3 py-2 border border-red-300 shadow-sm text-sm leading-4 font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Bulk Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}