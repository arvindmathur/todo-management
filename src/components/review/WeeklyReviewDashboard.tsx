"use client"

import { useState } from "react"
import { useWeeklyReview, useReviewStats } from "@/hooks/useWeeklyReview"
import { ReviewProjectList } from "./ReviewProjectList"
import { ReviewAreaList } from "./ReviewAreaList"
import { ReviewSummary } from "./ReviewSummary"
import { ReviewNotes } from "./ReviewNotes"

export function WeeklyReviewDashboard() {
  const { 
    reviewSession, 
    currentReview, 
    loading, 
    error, 
    startReview, 
    updateReview,
    completeReview,
    markProjectReviewed,
    markAreaReviewed 
  } = useWeeklyReview()
  
  const { stats } = useReviewStats()
  
  const [activeTab, setActiveTab] = useState<"overview" | "projects" | "areas" | "notes">("overview")
  const [isStarting, setIsStarting] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)

  const handleStartReview = async () => {
    setIsStarting(true)
    try {
      await startReview()
    } finally {
      setIsStarting(false)
    }
  }

  const handleCompleteReview = async () => {
    if (!currentReview) return

    setIsCompleting(true)
    try {
      await completeReview(currentReview.id)
    } finally {
      setIsCompleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading weekly review...</span>
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
            <h3 className="text-sm font-medium text-red-800">Error loading weekly review</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!reviewSession) {
    return (
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
        <h3 className="mt-2 text-sm font-medium text-gray-900">Unable to load review session</h3>
        <p className="mt-1 text-sm text-gray-500">
          There was an issue loading your review data. Please try again.
        </p>
      </div>
    )
  }

  // Show start review interface if no active review
  if (!currentReview) {
    return (
      <div className="max-w-4xl mx-auto">
        {/* Review Stats Header */}
        {stats && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Weekly Review</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Keep your GTD system trusted and up-to-date
                </p>
              </div>
              <div className="text-right">
                {stats.isOverdue ? (
                  <div className="text-red-600">
                    <p className="text-sm font-medium">Review Overdue</p>
                    <p className="text-xs">
                      {stats.daysSinceLastReview} days since last review
                    </p>
                  </div>
                ) : stats.daysSinceLastReview !== undefined ? (
                  <div className="text-gray-600">
                    <p className="text-sm font-medium">Last Review</p>
                    <p className="text-xs">
                      {stats.daysSinceLastReview} days ago
                    </p>
                  </div>
                ) : (
                  <div className="text-blue-600">
                    <p className="text-sm font-medium">First Review</p>
                    <p className="text-xs">Get started with GTD</p>
                  </div>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.reviewStreak}</div>
                <div className="text-xs text-gray-500">Week Streak</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.totalReviews}</div>
                <div className="text-xs text-gray-500">Total Reviews</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {reviewSession.summary.totalProjects}
                </div>
                <div className="text-xs text-gray-500">Active Projects</div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Overview */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Review Overview</h3>
          <ReviewSummary summary={reviewSession.summary} />
        </div>

        {/* Start Review */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Ready to Review?</h3>
            <p className="text-gray-600 mb-6">
              Take a few minutes to review your projects and areas to keep your system current.
            </p>
            <button
              onClick={handleStartReview}
              disabled={isStarting}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isStarting && (
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              Start Weekly Review
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Show active review interface
  const reviewData = currentReview.reviewData as any
  const projectsReviewed = reviewData.projectsReviewed || []
  const areasReviewed = reviewData.areasReviewed || []
  
  const totalItems = reviewSession.projects.length + reviewSession.areas.length
  const reviewedItems = projectsReviewed.length + areasReviewed.length
  const progress = totalItems > 0 ? (reviewedItems / totalItems) * 100 : 0

  const tabs = [
    { id: "overview" as const, name: "Overview", count: null },
    { id: "projects" as const, name: "Projects", count: reviewSession.projects.length },
    { id: "areas" as const, name: "Areas", count: reviewSession.areas.length },
    { id: "notes" as const, name: "Notes", count: null },
  ]

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Weekly Review in Progress</h2>
            <p className="text-sm text-gray-600 mt-1">
              Started {new Date(currentReview.startedAt).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">
                {reviewedItems} of {totalItems} reviewed
              </div>
              <div className="text-xs text-gray-500">
                {Math.round(progress)}% complete
              </div>
            </div>
            <button
              onClick={handleCompleteReview}
              disabled={isCompleting || progress < 100}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCompleting && (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              Complete Review
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {tab.name}
                {tab.count !== null && (
                  <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                    activeTab === tab.id
                      ? "bg-blue-100 text-blue-600"
                      : "bg-gray-100 text-gray-900"
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === "overview" && (
            <ReviewSummary summary={reviewSession.summary} />
          )}
          
          {activeTab === "projects" && (
            <ReviewProjectList
              projects={reviewSession.projects}
              reviewedProjects={projectsReviewed}
              onMarkReviewed={markProjectReviewed}
            />
          )}
          
          {activeTab === "areas" && (
            <ReviewAreaList
              areas={reviewSession.areas}
              reviewedAreas={areasReviewed}
              onMarkReviewed={markAreaReviewed}
            />
          )}
          
          {activeTab === "notes" && (
            <ReviewNotes
              currentReview={currentReview}
              onUpdate={(updates) => currentReview && updateReview(currentReview.id, updates)}
            />
          )}
        </div>
      </div>
    </div>
  )
}