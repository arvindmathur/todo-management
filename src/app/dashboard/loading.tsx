import { LoadingSpinner, LoadingCard } from "@/components/feedback"

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>

        {/* Stats cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <LoadingCard key={i} className="h-24" />
          ))}
        </div>

        {/* Main content skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <LoadingCard className="h-96" />
            <LoadingCard className="h-64" />
          </div>
          <div className="space-y-6">
            <LoadingCard className="h-48" />
            <LoadingCard className="h-32" />
          </div>
        </div>

        {/* Loading indicator */}
        <div className="fixed bottom-4 right-4">
          <div className="bg-white rounded-lg shadow-lg p-4 flex items-center space-x-3">
            <LoadingSpinner size="sm" />
            <span className="text-sm text-gray-600">Loading dashboard...</span>
          </div>
        </div>
      </div>
    </div>
  )
}