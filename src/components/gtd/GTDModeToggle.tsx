"use client"

import { useState } from "react"
import { useUserPreferences } from "@/hooks/useUserPreferences"

interface GTDModeToggleProps {
  onToggle?: (enabled: boolean) => void
  showLabel?: boolean
  size?: "sm" | "md" | "lg"
}

export function GTDModeToggle({ 
  onToggle, 
  showLabel = true, 
  size = "md" 
}: GTDModeToggleProps) {
  const { preferencesData, updatePreferences, loading } = useUserPreferences()
  const [isUpdating, setIsUpdating] = useState(false)

  const isGTDEnabled = preferencesData?.gtdEnabled || false

  const handleToggle = async () => {
    if (loading || isUpdating) return

    setIsUpdating(true)
    try {
      const newGTDState = !isGTDEnabled
      const result = await updatePreferences({ 
        gtdEnabled: newGTDState,
        // When enabling GTD, also set default view to GTD
        ...(newGTDState && { 
          defaultView: "gtd" as const
        })
      })
      
      if (result.success && onToggle) {
        onToggle(newGTDState)
      }
    } finally {
      setIsUpdating(false)
    }
  }

  const sizeClasses = {
    sm: "h-5 w-9",
    md: "h-6 w-11",
    lg: "h-7 w-12"
  }

  const thumbSizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5", 
    lg: "h-6 w-6"
  }

  const translateClasses = {
    sm: isGTDEnabled ? "translate-x-4" : "translate-x-0",
    md: isGTDEnabled ? "translate-x-5" : "translate-x-0",
    lg: isGTDEnabled ? "translate-x-5" : "translate-x-0"
  }

  if (loading) {
    return (
      <div className="flex items-center space-x-3">
        {showLabel && (
          <span className="text-sm font-medium text-gray-700">GTD Mode</span>
        )}
        <div className={`${sizeClasses[size]} bg-gray-200 rounded-full animate-pulse`}></div>
      </div>
    )
  }

  return (
    <div className="flex items-center space-x-3">
      {showLabel && (
        <span className="text-sm font-medium text-gray-700">GTD Mode</span>
      )}
      
      <button
        type="button"
        onClick={handleToggle}
        disabled={isUpdating}
        className={`${sizeClasses[size]} relative inline-flex flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
          isGTDEnabled ? "bg-blue-600" : "bg-gray-200"
        }`}
        role="switch"
        aria-checked={isGTDEnabled}
        aria-label="Toggle GTD mode"
      >
        <span
          className={`${thumbSizeClasses[size]} ${translateClasses[size]} pointer-events-none inline-block rounded-full bg-white shadow transform ring-0 transition duration-200 ease-in-out`}
        />
      </button>

      {isUpdating && (
        <svg className="animate-spin h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
    </div>
  )
}