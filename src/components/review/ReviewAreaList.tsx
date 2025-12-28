"use client"

import { ReviewArea } from "@/types/review"

interface ReviewAreaListProps {
  areas: ReviewArea[]
  reviewedAreas: string[]
  onMarkReviewed: (areaId: string) => Promise<any>
}

export function ReviewAreaList({ 
  areas, 
  reviewedAreas, 
  onMarkReviewed 
}: ReviewAreaListProps) {
  const handleMarkReviewed = async (areaId: string) => {
    await onMarkReviewed(areaId)
  }

  if (areas.length === 0) {
    return (
      <div className="text-center py-8">
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
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No areas to review</h3>
        <p className="mt-1 text-sm text-gray-500">
          You don't have any areas set up at the moment.
        </p>
      </div>
    )
  }

  // Separate areas by attention needed
  const areasNeedingAttention = areas.filter(a => a.needsAttention)
  const otherAreas = areas.filter(a => !a.needsAttention)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Area Review</h3>
        <div className="text-sm text-gray-500">
          {reviewedAreas.length} of {areas.length} reviewed
        </div>
      </div>

      {/* Areas Needing Attention */}
      {areasNeedingAttention.length > 0 && (
        <div>
          <h4 className="text-md font-medium text-orange-800 mb-3 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            Areas Needing Attention ({areasNeedingAttention.length})
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {areasNeedingAttention.map((area) => (
              <AreaCard
                key={area.id}
                area={area}
                isReviewed={reviewedAreas.includes(area.id)}
                onMarkReviewed={() => handleMarkReviewed(area.id)}
                needsAttention={true}
              />
            ))}
          </div>
        </div>
      )}

      {/* Other Areas */}
      {otherAreas.length > 0 && (
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-3">
            Other Areas ({otherAreas.length})
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {otherAreas.map((area) => (
              <AreaCard
                key={area.id}
                area={area}
                isReviewed={reviewedAreas.includes(area.id)}
                onMarkReviewed={() => handleMarkReviewed(area.id)}
                needsAttention={false}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

interface AreaCardProps {
  area: ReviewArea
  isReviewed: boolean
  onMarkReviewed: () => void
  needsAttention: boolean
}

function AreaCard({ area, isReviewed, onMarkReviewed, needsAttention }: AreaCardProps) {
  return (
    <div className={`border rounded-lg p-4 ${
      needsAttention ? "border-orange-200 bg-orange-50" : "border-gray-200 bg-white"
    } ${isReviewed ? "opacity-75" : ""}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          {area.color && (
            <div 
              className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
              style={{ backgroundColor: area.color }}
            />
          )}
          <h5 className="font-medium text-gray-900">{area.name}</h5>
        </div>
        
        <button
          onClick={onMarkReviewed}
          disabled={isReviewed}
          className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
            isReviewed
              ? "bg-green-100 text-green-800 cursor-not-allowed"
              : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
        >
          {isReviewed ? "✓ Reviewed" : "Mark Reviewed"}
        </button>
      </div>

      {area.description && (
        <p className="text-sm text-gray-600 mb-3">{area.description}</p>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-3">
        <div className="text-center">
          <div className="text-lg font-semibold text-blue-600">{area.projects.length}</div>
          <div className="text-xs text-gray-500">Projects</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-green-600">{area.tasks.length}</div>
          <div className="text-xs text-gray-500">Tasks</div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="mb-3">
        <h6 className="text-sm font-medium text-gray-900 mb-2">Recent Activity</h6>
        {area.recentActivity.length > 0 ? (
          <div className="space-y-1">
            {area.recentActivity.slice(0, 3).map((activity, index) => (
              <div key={index} className="text-xs text-gray-600 flex items-center justify-between">
                <span>{activity.description}</span>
                <span>{new Date(activity.date).toLocaleDateString()}</span>
              </div>
            ))}
            {area.recentActivity.length > 3 && (
              <div className="text-xs text-gray-500">
                +{area.recentActivity.length - 3} more activities
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-gray-500">No recent activity</p>
        )}
      </div>

      {/* Attention Reasons */}
      {needsAttention && area.attentionReasons.length > 0 && (
        <div className="bg-orange-100 border border-orange-200 rounded-md p-3">
          <p className="text-sm font-medium text-orange-800">Needs Attention:</p>
          <ul className="text-sm text-orange-700 mt-1 list-disc list-inside">
            {area.attentionReasons.map((reason, index) => (
              <li key={index}>{reason}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Projects Preview */}
      {area.projects.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <h6 className="text-sm font-medium text-gray-900 mb-2">Projects</h6>
          <div className="space-y-1">
            {area.projects.slice(0, 3).map((project) => (
              <div key={project.id} className="flex items-center justify-between text-sm">
                <span className="text-gray-900">{project.name}</span>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500">{Math.round(project.progress)}%</span>
                  <div className="w-12 bg-gray-200 rounded-full h-1">
                    <div 
                      className="bg-blue-600 h-1 rounded-full"
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
            {area.projects.length > 3 && (
              <div className="text-xs text-gray-500">
                +{area.projects.length - 3} more projects
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}