"use client"

import { createContext, useContext, ReactNode } from "react"
import { useUserPreferences } from "@/hooks/useUserPreferences"

interface GTDFeatureContextType {
  isGTDEnabled: boolean
  showInbox: boolean
  showContexts: boolean
  showAreas: boolean
  showProjects: boolean
  showWeeklyReview: boolean
  isLoading: boolean
}

const GTDFeatureContext = createContext<GTDFeatureContextType | undefined>(undefined)

interface GTDFeatureProviderProps {
  children: ReactNode
}

export function GTDFeatureProvider({ children }: GTDFeatureProviderProps) {
  const { preferencesData, loading } = useUserPreferences()
  
  const isGTDEnabled = preferencesData?.gtdEnabled || false
  const defaultView = preferencesData?.preferences?.defaultView || "simple"
  
  // Determine feature visibility based on GTD mode and user preferences
  const showGTDFeatures = isGTDEnabled && defaultView === "gtd"
  
  const contextValue: GTDFeatureContextType = {
    isGTDEnabled,
    showInbox: showGTDFeatures,
    showContexts: showGTDFeatures,
    showAreas: showGTDFeatures,
    showProjects: true, // Projects are available in both modes
    showWeeklyReview: showGTDFeatures,
    isLoading: loading,
  }

  return (
    <GTDFeatureContext.Provider value={contextValue}>
      {children}
    </GTDFeatureContext.Provider>
  )
}

export function useGTDFeatures() {
  const context = useContext(GTDFeatureContext)
  if (context === undefined) {
    throw new Error("useGTDFeatures must be used within a GTDFeatureProvider")
  }
  return context
}

// Helper hook for conditional rendering
export function useFeatureVisibility() {
  const features = useGTDFeatures()
  
  return {
    ...features,
    // Helper functions for common checks
    canShowFeature: (feature: keyof Omit<GTDFeatureContextType, 'isLoading'>) => {
      return features[feature] === true
    },
    isSimpleMode: () => !features.isGTDEnabled || !features.showInbox,
    isGTDMode: () => features.isGTDEnabled && features.showInbox,
  }
}