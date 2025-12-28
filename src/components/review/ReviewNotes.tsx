"use client"

import { useState, useEffect } from "react"
import { WeeklyReview } from "@/types/review"

interface ReviewNotesProps {
  currentReview: WeeklyReview
  onUpdate: (updates: { notes?: string; nextWeekFocus?: string }) => Promise<any>
}

export function ReviewNotes({ currentReview, onUpdate }: ReviewNotesProps) {
  const reviewData = currentReview.reviewData as any
  const [notes, setNotes] = useState(reviewData.notes || "")
  const [nextWeekFocus, setNextWeekFocus] = useState(reviewData.nextWeekFocus || "")
  const [isUpdating, setIsUpdating] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  // Auto-save functionality
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (notes !== (reviewData.notes || "") || nextWeekFocus !== (reviewData.nextWeekFocus || "")) {
        setIsUpdating(true)
        try {
          await onUpdate({ notes, nextWeekFocus })
          setLastSaved(new Date())
        } finally {
          setIsUpdating(false)
        }
      }
    }, 1000) // Auto-save after 1 second of inactivity

    return () => clearTimeout(timeoutId)
  }, [notes, nextWeekFocus, reviewData.notes, reviewData.nextWeekFocus, onUpdate])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Review Notes</h3>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          {isUpdating && (
            <>
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Saving...</span>
            </>
          )}
          {lastSaved && !isUpdating && (
            <span>Saved {lastSaved.toLocaleTimeString()}</span>
          )}
        </div>
      </div>

      {/* Review Notes */}
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
          Review Notes
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={isUpdating}
          rows={6}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
          placeholder="Capture thoughts, insights, and observations from this review..."
        />
        <p className="mt-1 text-sm text-gray-500">
          Record any insights, concerns, or observations from reviewing your projects and areas.
        </p>
      </div>

      {/* Next Week Focus */}
      <div>
        <label htmlFor="nextWeekFocus" className="block text-sm font-medium text-gray-700 mb-2">
          Next Week Focus
        </label>
        <textarea
          id="nextWeekFocus"
          value={nextWeekFocus}
          onChange={(e) => setNextWeekFocus(e.target.value)}
          disabled={isUpdating}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
          placeholder="What are your key priorities and focus areas for the coming week?"
        />
        <p className="mt-1 text-sm text-gray-500">
          Set your intentions and priorities for the upcoming week based on this review.
        </p>
      </div>

      {/* Review Guidelines */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Weekly Review Guidelines</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Review all active projects and ensure they have clear next actions</li>
          <li>• Check areas for balance and identify any that need more attention</li>
          <li>• Capture any new commitments or ideas that came up during the week</li>
          <li>• Reflect on what went well and what could be improved</li>
          <li>• Set clear priorities and focus areas for the coming week</li>
        </ul>
      </div>

      {/* Review History */}
      <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-2">This Review Session</h4>
        <div className="text-sm text-gray-600 space-y-1">
          <p>Started: {new Date(currentReview.startedAt).toLocaleString()}</p>
          <p>Status: {currentReview.status === "in_progress" ? "In Progress" : "Completed"}</p>
          {currentReview.completedAt && (
            <p>Completed: {new Date(currentReview.completedAt).toLocaleString()}</p>
          )}
        </div>
      </div>
    </div>
  )
}