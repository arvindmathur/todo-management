"use client"

interface ReviewSummaryProps {
  summary: {
    totalProjects: number
    activeProjects: number
    projectsNeedingAttention: number
    totalAreas: number
    areasNeedingAttention: number
    completedTasksThisWeek: number
    overdueTasks: number
  }
}

export function ReviewSummary({ summary }: ReviewSummaryProps) {
  const summaryItems = [
    {
      label: "Total Projects",
      value: summary.totalProjects,
      color: "blue",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      )
    },
    {
      label: "Active Projects",
      value: summary.activeProjects,
      color: "green",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      )
    },
    {
      label: "Projects Need Attention",
      value: summary.projectsNeedingAttention,
      color: summary.projectsNeedingAttention > 0 ? "red" : "gray",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      )
    },
    {
      label: "Total Areas",
      value: summary.totalAreas,
      color: "purple",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      )
    },
    {
      label: "Areas Need Attention",
      value: summary.areasNeedingAttention,
      color: summary.areasNeedingAttention > 0 ? "orange" : "gray",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4 19h5v-5H4v5zM13 13h5V8h-5v5zM4 13h5V8H4v5zM13 3h5v5h-5V3zM4 3h5v5H4V3z" />
        </svg>
      )
    },
    {
      label: "Completed This Week",
      value: summary.completedTasksThisWeek,
      color: "green",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    }
  ]

  const getColorClasses = (color: string) => {
    const colors = {
      blue: "bg-blue-100 text-blue-800",
      green: "bg-green-100 text-green-800",
      red: "bg-red-100 text-red-800",
      orange: "bg-orange-100 text-orange-800",
      purple: "bg-purple-100 text-purple-800",
      gray: "bg-gray-100 text-gray-800"
    }
    return colors[color as keyof typeof colors] || colors.gray
  }

  return (
    <div>
      <h3 className="text-lg font-medium text-gray-900 mb-4">Review Summary</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {summaryItems.map((item, index) => (
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

      {/* Attention Items */}
      {(summary.projectsNeedingAttention > 0 || summary.areasNeedingAttention > 0) && (
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Items Need Your Attention</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <ul className="list-disc list-inside space-y-1">
                  {summary.projectsNeedingAttention > 0 && (
                    <li>{summary.projectsNeedingAttention} project{summary.projectsNeedingAttention === 1 ? '' : 's'} need attention</li>
                  )}
                  {summary.areasNeedingAttention > 0 && (
                    <li>{summary.areasNeedingAttention} area{summary.areasNeedingAttention === 1 ? '' : 's'} need attention</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {summary.projectsNeedingAttention === 0 && summary.areasNeedingAttention === 0 && summary.totalProjects > 0 && (
        <div className="mt-6 bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">System Looking Good!</h3>
              <div className="mt-2 text-sm text-green-700">
                <p>All your projects and areas are in good shape. Great job maintaining your GTD system!</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}