import { UserPreferences } from "@/hooks/useUserPreferences"

export const DEFAULT_PREFERENCES: UserPreferences = {
  completedTaskRetention: 90,
  completedTaskVisibility: "none",
  defaultView: "simple",
  theme: "system",
  notifications: {
    email: true,
    browser: true,
    weeklyReview: true
  },
  taskDefaults: {
    priority: "medium",
    dueDate: "today"
  },
  taskSorting: {
    primary: "priority",
    primaryOrder: "desc",
    secondary: "dueDate", 
    secondaryOrder: "asc",
    tertiary: "title",
    tertiaryOrder: "asc"
  },
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  dateFormat: "MM/DD/YYYY",
  timeFormat: "12h"
}

export function getRetentionLabel(days: number): string {
  switch (days) {
    case 30:
      return "30 days"
    case 90:
      return "90 days"
    case 365:
      return "1 year"
    case -1:
      return "Keep indefinitely"
    default:
      return `${days} days`
  }
}

export function getThemeLabel(theme: string): string {
  switch (theme) {
    case "light":
      return "Light"
    case "dark":
      return "Dark"
    case "system":
      return "System"
    default:
      return theme
  }
}

export function getViewLabel(view: string): string {
  switch (view) {
    case "simple":
      return "Simple Task Management"
    case "gtd":
      return "GTD Methodology"
    default:
      return view
  }
}

export function shouldShowGTDFeatures(gtdEnabled: boolean, defaultView: string): boolean {
  return gtdEnabled && defaultView === "gtd"
}

export function isTaskRetentionExpired(completedAt: Date, retentionDays: number): boolean {
  if (retentionDays === -1) return false // Keep indefinitely
  
  const now = new Date()
  const completedDate = new Date(completedAt)
  const daysDiff = Math.floor((now.getTime() - completedDate.getTime()) / (1000 * 60 * 60 * 24))
  
  return daysDiff > retentionDays
}