"use client"

import { useCompletedTaskStats } from "@/hooks/useCompletedTasks"

export function CompletedTaskStats() {
  const { stats, loading, error } = useCompletedTaskStats()

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-sm text-red-600">Failed to load statistics</p>
      </div>
    )
  }

  const statItems = [
    {
      label: "Total Completed",
      value: stats.totalCompleted,
      color: "blue",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      label: "This Week",
      value: stats.thisWeekCompleted,
      color: "green",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      )
    },
    {
      label: "This Month",
      value: stats.thisMonthCompleted,
      color: "purple",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      label: "Archived",
      value: stats.archivedCompleted,
      color: "gray",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8l6 6 6-6" />
        </svg>
      )
    }
  ]

  const getColorClasses = (color: string) => {
    const colors = {
      blue: "bg-blue-100 text-blue-800",
      green: "bg-green-100 text-green-800",
      purple: "bg-purple-100 text-purple-800",
      gray: "bg-gray-100 text-gray-800"
    }
    return colors[color as keyof typeof colors] || colors.gray
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Completion Statistics</h3>
      
      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statItems.map((item, index) => (
          <div key={index} className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center">
              <div className={`flex-shrink-0 p-2 rounded-md ${getColorClasses(item.color)}`}>
                {item.icon}
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">{item.value}</div>
                <div className="text-sm text-gray-600">{item.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Breakdown by Category */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* By Project */}
        {stats.completedByProject.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">By Project</h4>
            <div className="space-y-2">
              {stats.completedByProject.slice(0, 5).map((item) => (
                <div key={item.projectId} className="flex items-center justify-between text-sm">
                  <span className="text-gray-900 truncate">{item.projectName}</span>
                  <span className="text-gray-500 font-medium">{item.count}</span>
                </div>
              ))}
              {stats.completedByProject.length > 5 && (
                <div className="text-xs text-gray-500">
                  +{stats.completedByProject.length - 5} more projects
                </div>
              )}
            </div>
          </div>
        )}

        {/* By Area */}
        {stats.completedByArea.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">By Area</h4>
            <div className="space-y-2">
              {stats.completedByArea.slice(0, 5).map((item) => (
                <div key={item.areaId} className="flex items-center justify-between text-sm">
                  <div className="flex items-center">
                    {item.areaColor && (
                      <div 
                        className="w-3 h-3 rounded-full mr-2"
                        style={{ backgroundColor: item.areaColor }}
                      />
                    )}
                    <span className="text-gray-900 truncate">{item.areaName}</span>
                  </div>
                  <span className="text-gray-500 font-medium">{item.count}</span>
                </div>
              ))}
              {stats.completedByArea.length > 5 && (
                <div className="text-xs text-gray-500">
                  +{stats.completedByArea.length - 5} more areas
                </div>
              )}
            </div>
          </div>
        )}

        {/* By Context */}
        {stats.completedByContext.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">By Context</h4>
            <div className="space-y-2">
              {stats.completedByContext.slice(0, 5).map((item) => (
                <div key={item.contextId} className="flex items-center justify-between text-sm">
                  <div className="flex items-center">
                    {item.contextIcon && (
                      <span className="mr-2">{item.contextIcon}</span>
                    )}
                    <span className="text-gray-900 truncate">{item.contextName}</span>
                  </div>
                  <span className="text-gray-500 font-medium">{item.count}</span>
                </div>
              ))}
              {stats.completedByContext.length > 5 && (
                <div className="text-xs text-gray-500">
                  +{stats.completedByContext.length - 5} more contexts
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Retention Info */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">Task Retention</h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  Tasks completed more than 90 days ago are automatically archived. 
                  You can still view and manage them using the "Show archived tasks" filter.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}