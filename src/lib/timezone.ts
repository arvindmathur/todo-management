import { UserPreferences } from "@/hooks/useUserPreferences"

export interface DateFormatOptions {
  timezone?: string
  dateFormat?: "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD"
  timeFormat?: "12h" | "24h"
}

// Create a date in the user's timezone from a date string (YYYY-MM-DD)
export function createDateInTimezone(dateString: string, timezone?: string): Date {
  if (!dateString) return new Date()
  
  // Parse YYYY-MM-DD format
  const [year, month, day] = dateString.split('-').map(Number)
  
  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    console.error('Invalid date string format:', dateString)
    return new Date()
  }
  
  // Always create date in local timezone to avoid timezone conversion issues
  // The date input field expects local dates, not UTC dates
  const date = new Date(year, month - 1, day) // month is 0-indexed
  date.setHours(0, 0, 0, 0) // Set to start of day
  
  return date
}

// Format a date according to user preferences
export function formatDate(date: Date, options: DateFormatOptions = {}): string {
  const { dateFormat = "MM/DD/YYYY", timezone } = options
  
  const formatOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: timezone
  }
  
  const formatted = new Intl.DateTimeFormat('en-US', formatOptions).format(date)
  const [month, day, year] = formatted.split('/')
  
  switch (dateFormat) {
    case "DD/MM/YYYY":
      return `${day}/${month}/${year}`
    case "YYYY-MM-DD":
      return `${year}-${month}-${day}`
    case "MM/DD/YYYY":
    default:
      return `${month}/${day}/${year}`
  }
}

// Format time according to user preferences
export function formatTime(date: Date, options: DateFormatOptions = {}): string {
  const { timeFormat = "12h", timezone } = options
  
  const formatOptions: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
    hour12: timeFormat === "12h",
    timeZone: timezone
  }
  
  return new Intl.DateTimeFormat('en-US', formatOptions).format(date)
}

// Format datetime according to user preferences
export function formatDateTime(date: Date, options: DateFormatOptions = {}): string {
  return `${formatDate(date, options)} ${formatTime(date, options)}`
}

// Get date string for input fields (always YYYY-MM-DD)
export function getDateInputValue(date: Date, timezone?: string): string {
  const formatOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: timezone
  }
  
  const formatted = new Intl.DateTimeFormat('en-CA', formatOptions).format(date) // en-CA gives YYYY-MM-DD
  return formatted
}

// Check if a date is today in the user's timezone
export function isToday(date: Date, timezone?: string): boolean {
  const today = new Date()
  const dateInTimezone = timezone ? 
    new Date(date.toLocaleString("en-US", { timeZone: timezone })) : 
    date
  const todayInTimezone = timezone ? 
    new Date(today.toLocaleString("en-US", { timeZone: timezone })) : 
    today
    
  return dateInTimezone.toDateString() === todayInTimezone.toDateString()
}

// Check if a date is overdue in the user's timezone
export function isOverdue(date: Date, timezone?: string): boolean {
  const today = new Date()
  const dateInTimezone = timezone ? 
    new Date(date.toLocaleString("en-US", { timeZone: timezone })) : 
    date
  const todayInTimezone = timezone ? 
    new Date(today.toLocaleString("en-US", { timeZone: timezone })) : 
    today
    
  // Set both dates to start of day for comparison
  dateInTimezone.setHours(0, 0, 0, 0)
  todayInTimezone.setHours(0, 0, 0, 0)
  
  return dateInTimezone < todayInTimezone
}

// Get common timezone options
export function getTimezoneOptions(): Array<{ value: string; label: string }> {
  const timezones = [
    'America/New_York',
    'America/Chicago', 
    'America/Denver',
    'America/Los_Angeles',
    'America/Anchorage',
    'Pacific/Honolulu',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Europe/Rome',
    'Europe/Madrid',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Asia/Kolkata',
    'Asia/Dubai',
    'Australia/Sydney',
    'Australia/Melbourne',
    'Pacific/Auckland'
  ]
  
  return timezones.map(tz => ({
    value: tz,
    label: tz.replace(/_/g, ' ').replace('/', ' / ')
  }))
}

// Auto-detect user's timezone
export function detectTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}