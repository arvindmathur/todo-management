"use client"

import { ProjectFilters } from "@/types/project"
import { useAreas } from "@/hooks/useAreas"

interface ProjectFiltersProps {
  filters: ProjectFilters
  onFiltersChange: (filters: Partial<ProjectFilters>) => void
  onClearFilters: () => void
  isLoading?: boolean
}

export function ProjectFiltersComponent({ 
  filters, 
  onFiltersChange, 
  onClearFilters, 
  isLoading 
}: ProjectFiltersProps) {
  const { areas } = useAreas()
  
  const hasActiveFilters = Object.values(filters).some(value => 
    value !== undefined && value !== null && value !== ""
  )

  return (
    <div className="bg-white rounded-lg border p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900">Filters</h3>
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            Clear all
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Status Filter */}
        <div>
          <label htmlFor="status-filter" className="block text-xs font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            id="status-filter"
            value={filters.status || ""}
            onChange={(e) => onFiltersChange({ 
              status: e.target.value as any || undefined 
            })}
            className="block w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            disabled={isLoading}
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="someday">Someday/Maybe</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
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
            {areas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.name}
              </option>
            ))}
          </select>
        </div>

        {/* Limit */}
        <div>
          <label htmlFor="limit-filter" className="block text-xs font-medium text-gray-700 mb-1">
            Show
          </label>
          <select
            id="limit-filter"
            value={filters.limit || 100}
            onChange={(e) => onFiltersChange({ 
              limit: parseInt(e.target.value) || undefined 
            })}
            className="block w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            disabled={isLoading}
          >
            <option value={25}>25 projects</option>
            <option value={50}>50 projects</option>
            <option value={100}>100 projects</option>
            <option value={200}>200 projects</option>
          </select>
        </div>
      </div>
    </div>
  )
}