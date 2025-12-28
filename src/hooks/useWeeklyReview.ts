"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { 
  WeeklyReview, 
  ReviewSession, 
  CreateWeeklyReviewRequest, 
  UpdateWeeklyReviewRequest,
  ReviewStatsResponse 
} from "@/types/review"

export function useWeeklyReview() {
  const { data: session, status } = useSession()
  const [reviewSession, setReviewSession] = useState<ReviewSession | null>(null)
  const [currentReview, setCurrentReview] = useState<WeeklyReview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchReviewSession = useCallback(async () => {
    if (status !== "authenticated") return

    try {
      setLoading(true)
      const response = await fetch("/api/reviews")
      
      if (response.ok) {
        const data = await response.json()
        setReviewSession(data.session)
        setCurrentReview(data.currentReview)
        setError(null)
      } else {
        const errorData = await response.json()
        setError(errorData.error || "Failed to load review session")
      }
    } catch (err) {
      setError("Failed to load review session")
    } finally {
      setLoading(false)
    }
  }, [status])

  const startReview = async (reviewData: CreateWeeklyReviewRequest = {}) => {
    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(reviewData),
      })

      if (response.ok) {
        const data = await response.json()
        setCurrentReview(data.review)
        setError(null)
        // Refresh session data
        await fetchReviewSession()
        return { success: true, review: data.review }
      } else {
        const errorData = await response.json()
        setError(errorData.error || "Failed to start review")
        return { success: false, error: errorData.error }
      }
    } catch (err) {
      const errorMessage = "Failed to start review"
      setError(errorMessage)
      return { success: false, error: errorMessage }
    }
  }

  const updateReview = async (reviewId: string, updates: UpdateWeeklyReviewRequest) => {
    try {
      const response = await fetch(`/api/reviews/${reviewId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      })

      if (response.ok) {
        const data = await response.json()
        setCurrentReview(data.review)
        setError(null)
        return { success: true, review: data.review }
      } else {
        const errorData = await response.json()
        setError(errorData.error || "Failed to update review")
        return { success: false, error: errorData.error }
      }
    } catch (err) {
      const errorMessage = "Failed to update review"
      setError(errorMessage)
      return { success: false, error: errorMessage }
    }
  }

  const completeReview = async (reviewId: string, finalData: Partial<UpdateWeeklyReviewRequest> = {}) => {
    try {
      const response = await fetch(`/api/reviews/${reviewId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...finalData,
          status: "completed"
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setCurrentReview(null) // Clear current review since it's completed
        setError(null)
        // Refresh session data
        await fetchReviewSession()
        return { success: true, review: data.review }
      } else {
        const errorData = await response.json()
        setError(errorData.error || "Failed to complete review")
        return { success: false, error: errorData.error }
      }
    } catch (err) {
      const errorMessage = "Failed to complete review"
      setError(errorMessage)
      return { success: false, error: errorMessage }
    }
  }

  const deleteReview = async (reviewId: string) => {
    try {
      const response = await fetch(`/api/reviews/${reviewId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setCurrentReview(null)
        setError(null)
        // Refresh session data
        await fetchReviewSession()
        return { success: true }
      } else {
        const errorData = await response.json()
        setError(errorData.error || "Failed to delete review")
        return { success: false, error: errorData.error }
      }
    } catch (err) {
      const errorMessage = "Failed to delete review"
      setError(errorMessage)
      return { success: false, error: errorMessage }
    }
  }

  const markProjectReviewed = async (projectId: string) => {
    if (!currentReview) return { success: false, error: "No active review" }

    const currentData = currentReview.reviewData as any
    const projectsReviewed = currentData.projectsReviewed || []
    
    if (!projectsReviewed.includes(projectId)) {
      const updatedProjects = [...projectsReviewed, projectId]
      return await updateReview(currentReview.id, {
        projectsReviewed: updatedProjects
      })
    }
    
    return { success: true, review: currentReview }
  }

  const markAreaReviewed = async (areaId: string) => {
    if (!currentReview) return { success: false, error: "No active review" }

    const currentData = currentReview.reviewData as any
    const areasReviewed = currentData.areasReviewed || []
    
    if (!areasReviewed.includes(areaId)) {
      const updatedAreas = [...areasReviewed, areaId]
      return await updateReview(currentReview.id, {
        areasReviewed: updatedAreas
      })
    }
    
    return { success: true, review: currentReview }
  }

  useEffect(() => {
    fetchReviewSession()
  }, [fetchReviewSession])

  return {
    reviewSession,
    currentReview,
    loading,
    error,
    startReview,
    updateReview,
    completeReview,
    deleteReview,
    markProjectReviewed,
    markAreaReviewed,
    refetch: fetchReviewSession,
  }
}

// Hook for review statistics
export function useReviewStats() {
  const { data: session, status } = useSession()
  const [stats, setStats] = useState<ReviewStatsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    if (status !== "authenticated") return

    try {
      setLoading(true)
      const response = await fetch("/api/reviews/stats")
      
      if (response.ok) {
        const data = await response.json()
        setStats(data)
        setError(null)
      } else {
        const errorData = await response.json()
        setError(errorData.error || "Failed to load review stats")
      }
    } catch (err) {
      setError("Failed to load review stats")
    } finally {
      setLoading(false)
    }
  }, [status])

  useEffect(() => {
    fetchStats()
    
    // Refresh stats every hour
    const interval = setInterval(fetchStats, 60 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchStats])

  return {
    stats,
    loading,
    error,
    refetch: fetchStats,
  }
}