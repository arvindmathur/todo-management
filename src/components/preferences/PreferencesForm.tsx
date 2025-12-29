"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useUserPreferences, UserPreferences } from "@/hooks/useUserPreferences"
import { GTDModeToggle } from "@/components/gtd/GTDModeToggle"
import { GTDOnboarding } from "@/components/gtd/GTDOnboarding"
import { getTimezoneOptions, detectTimezone } from "@/lib/timezone"

export function PreferencesForm() {
  const router = useRouter()
  const { preferencesData, updatePreferences, loading, error } = useUserPreferences()
  const [formData, setFormData] = useState<UserPreferences | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [updateMessage, setUpdateMessage] = useState<string | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  
  // Password change state
  const [showPasswordChange, setShowPasswordChange] = useState(false)
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  })
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  useEffect(() => {
    if (preferencesData?.preferences) {
      setFormData(preferencesData.preferences)
      setHasUnsavedChanges(false)
    }
  }, [preferencesData])

  const handleSaveAll = async () => {
    if (!formData || !hasUnsavedChanges) return

    setIsUpdating(true)
    try {
      const result = await updatePreferences({
        preferences: formData
      })
      
      if (result.success) {
        setHasUnsavedChanges(false)
        setUpdateMessage("All preferences saved successfully")
        setTimeout(() => setUpdateMessage(null), 3000)
      }
    } finally {
      setIsUpdating(false)
    }
  }

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      if (confirm("You have unsaved changes. Are you sure you want to cancel?")) {
        setFormData(preferencesData?.preferences || null)
        setHasUnsavedChanges(false)
        router.push("/dashboard")
      }
    } else {
      router.push("/dashboard")
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError(null)
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError("Passwords don't match")
      return
    }

    setIsChangingPassword(true)
    try {
      const response = await fetch("/api/user/change-password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(passwordData),
      })

      if (response.ok) {
        setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" })
        setShowPasswordChange(false)
        setUpdateMessage("Password changed successfully")
        setTimeout(() => setUpdateMessage(null), 3000)
      } else {
        const errorData = await response.json()
        setPasswordError(errorData.error || "Failed to change password")
      }
    } catch (error) {
      setPasswordError("Failed to change password")
    } finally {
      setIsChangingPassword(false)
    }
  }

  const handleGTDToggle = (enabled: boolean) => {
    if (enabled && !preferencesData?.preferences?.gtdOnboardingCompleted) {
      setShowOnboarding(true)
    }
  }

  const handleOnboardingComplete = () => {
    setShowOnboarding(false)
    setUpdateMessage("GTD mode enabled! You can now access all GTD features.")
    setTimeout(() => setUpdateMessage(null), 5000)
  }

  const handleOnboardingSkip = () => {
    setShowOnboarding(false)
    setUpdateMessage("GTD mode enabled. You can access the onboarding guide anytime from help.")
    setTimeout(() => setUpdateMessage(null), 5000)
  }

  const handlePreferenceUpdate = async (updates: Partial<UserPreferences>) => {
    if (!formData) return

    const newFormData = { ...formData, ...updates }
    setFormData(newFormData)
    setHasUnsavedChanges(true)
  }

  const handleNotificationUpdate = async (notificationUpdates: Partial<UserPreferences['notifications']>) => {
    if (!formData) return

    const updatedNotifications = {
      ...formData.notifications,
      ...notificationUpdates
    }

    await handlePreferenceUpdate({ notifications: updatedNotifications })
  }

  if (loading || !formData) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        <div className="space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
        <div className="space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Top Navigation */}
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Preferences</h1>
          <p className="mt-1 text-sm text-gray-600">
            Customize your productivity workflow and application settings.
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveAll}
            disabled={!hasUnsavedChanges || isUpdating}
            className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
              hasUnsavedChanges && !isUpdating
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-gray-400 cursor-not-allowed"
            }`}
          >
            {isUpdating ? "Saving..." : "Save All"}
          </button>
        </div>
      </div>

      <div className="space-y-8">
        {/* Success/Error Messages */}
        {updateMessage && (
          <div className="bg-green-50 border border-green-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800">{updateMessage}</p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Account Security */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Account Security</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Password</h4>
                <p className="text-sm text-gray-500 mt-1">
                  Change your account password for security.
                </p>
              </div>
              <button
                onClick={() => setShowPasswordChange(!showPasswordChange)}
                className="px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 border border-blue-300 rounded-md hover:bg-blue-50"
              >
                Change Password
              </button>
            </div>

            {showPasswordChange && (
              <form onSubmit={handlePasswordChange} className="mt-4 p-4 bg-gray-50 rounded-md space-y-4">
                <div>
                  <label htmlFor="current-password" className="block text-sm font-medium text-gray-700 mb-1">
                    Current Password
                  </label>
                  <input
                    type="password"
                    id="current-password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    id="new-password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    minLength={8}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    id="confirm-password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    required
                  />
                </div>
                {passwordError && (
                  <div className="text-sm text-red-600">{passwordError}</div>
                )}
                <div className="flex space-x-3">
                  <button
                    type="submit"
                    disabled={isChangingPassword}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {isChangingPassword ? "Changing..." : "Change Password"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordChange(false)
                      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" })
                      setPasswordError(null)
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* GTD Mode Section */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Productivity Mode</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h4 className="text-sm font-medium text-gray-900">Getting Things Done (GTD)</h4>
                <p className="text-sm text-gray-500 mt-1">
                  Enable advanced productivity features including inbox processing, contexts, areas, and weekly reviews.
                </p>
              </div>
              <GTDModeToggle onToggle={handleGTDToggle} showLabel={false} />
            </div>

            {preferencesData?.gtdEnabled && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">GTD Mode Active</h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <p>You now have access to inbox processing, contexts, areas, and weekly reviews.</p>
                      {!preferencesData.preferences?.gtdOnboardingCompleted && (
                        <button
                          onClick={() => setShowOnboarding(true)}
                          className="mt-2 text-sm font-medium text-blue-800 hover:text-blue-900 underline"
                        >
                          View GTD onboarding guide
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Default View */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Default View</h3>
          
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="radio"
                name="defaultView"
                value="simple"
                checked={formData.defaultView === "simple"}
                onChange={(e) => handlePreferenceUpdate({ defaultView: e.target.value as "simple" | "gtd" })}
                disabled={isUpdating}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <div className="ml-3">
                <span className="text-sm font-medium text-gray-900">Simple Task Management</span>
                <p className="text-sm text-gray-500">Focus on basic task creation, completion, and organization.</p>
              </div>
            </label>
            
            <label className="flex items-center">
              <input
                type="radio"
                name="defaultView"
                value="gtd"
                checked={formData.defaultView === "gtd"}
                onChange={(e) => handlePreferenceUpdate({ defaultView: e.target.value as "simple" | "gtd" })}
                disabled={isUpdating || !preferencesData?.gtdEnabled}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 disabled:opacity-50"
              />
              <div className="ml-3">
                <span className="text-sm font-medium text-gray-900">GTD Methodology</span>
                <p className="text-sm text-gray-500">
                  Full GTD workflow with inbox, contexts, areas, and reviews.
                  {!preferencesData?.gtdEnabled && " (Enable GTD mode first)"}
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Completed Task Retention */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Completed Tasks</h3>
          
          <div>
            <label htmlFor="retention" className="block text-sm font-medium text-gray-700 mb-2">
              Keep completed tasks for
            </label>
            <select
              id="retention"
              value={formData.completedTaskRetention}
              onChange={(e) => handlePreferenceUpdate({ 
                completedTaskRetention: parseInt(e.target.value) as 30 | 90 | 365 | -1 
              })}
              disabled={isUpdating}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:opacity-50"
            >
              <option value={30}>30 days</option>
              <option value={90}>90 days</option>
              <option value={365}>1 year</option>
              <option value={-1}>Keep indefinitely</option>
            </select>
            <p className="mt-2 text-sm text-gray-500">
              Completed tasks older than this period will be automatically archived but remain accessible.
            </p>
          </div>
        </div>

        {/* Theme */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Appearance</h3>
          
          <div>
            <label htmlFor="theme" className="block text-sm font-medium text-gray-700 mb-2">
              Theme
            </label>
            <select
              id="theme"
              value={formData.theme}
              onChange={(e) => handlePreferenceUpdate({ 
                theme: e.target.value as "light" | "dark" | "system" 
              })}
              disabled={isUpdating}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:opacity-50"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">System</option>
            </select>
            <p className="mt-2 text-sm text-gray-500">
              Choose your preferred color scheme. System will match your device settings.
            </p>
          </div>
        </div>

        {/* Task Defaults */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Task Defaults</h3>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="default-priority" className="block text-sm font-medium text-gray-700 mb-2">
                Default Priority
              </label>
              <select
                id="default-priority"
                value={formData.taskDefaults?.priority || "medium"}
                onChange={(e) => handlePreferenceUpdate({ 
                  taskDefaults: {
                    priority: e.target.value as "urgent" | "high" | "medium" | "low",
                    dueDate: formData.taskDefaults?.dueDate || "today"
                  }
                })}
                disabled={isUpdating}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:opacity-50"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
              <p className="mt-2 text-sm text-gray-500">
                Default priority for new tasks created via inline creator.
              </p>
            </div>

            <div>
              <label htmlFor="default-due-date" className="block text-sm font-medium text-gray-700 mb-2">
                Default Due Date
              </label>
              <select
                id="default-due-date"
                value={formData.taskDefaults?.dueDate || "today"}
                onChange={(e) => handlePreferenceUpdate({ 
                  taskDefaults: {
                    priority: formData.taskDefaults?.priority || "medium",
                    dueDate: e.target.value as "today" | "tomorrow" | "none"
                  }
                })}
                disabled={isUpdating}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:opacity-50"
              >
                <option value="none">No due date</option>
                <option value="today">Today</option>
                <option value="tomorrow">Tomorrow</option>
              </select>
              <p className="mt-2 text-sm text-gray-500">
                Default due date for new tasks created via inline creator.
              </p>
            </div>
          </div>
        </div>

        {/* Regional Preferences */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Regional Preferences</h3>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 mb-2">
                Timezone
              </label>
              <select
                id="timezone"
                value={formData.timezone || detectTimezone()}
                onChange={(e) => handlePreferenceUpdate({ timezone: e.target.value })}
                disabled={isUpdating}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:opacity-50"
              >
                {getTimezoneOptions().map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-sm text-gray-500">
                Your timezone affects how dates and times are displayed and calculated.
              </p>
            </div>

            <div>
              <label htmlFor="date-format" className="block text-sm font-medium text-gray-700 mb-2">
                Date Format
              </label>
              <select
                id="date-format"
                value={formData.dateFormat || "MM/DD/YYYY"}
                onChange={(e) => handlePreferenceUpdate({ 
                  dateFormat: e.target.value as "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD" 
                })}
                disabled={isUpdating}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:opacity-50"
              >
                <option value="MM/DD/YYYY">MM/DD/YYYY (12/31/2024)</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY (31/12/2024)</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD (2024-12-31)</option>
              </select>
            </div>

            <div>
              <label htmlFor="time-format" className="block text-sm font-medium text-gray-700 mb-2">
                Time Format
              </label>
              <select
                id="time-format"
                value={formData.timeFormat || "12h"}
                onChange={(e) => handlePreferenceUpdate({ 
                  timeFormat: e.target.value as "12h" | "24h" 
                })}
                disabled={isUpdating}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:opacity-50"
              >
                <option value="12h">12-hour (2:30 PM)</option>
                <option value="24h">24-hour (14:30)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Task Sorting */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Task Sorting</h3>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="primary-sort" className="block text-sm font-medium text-gray-700 mb-2">
                  Primary Sort
                </label>
                <select
                  id="primary-sort"
                  value={formData.taskSorting?.primary || "priority"}
                  onChange={(e) => handlePreferenceUpdate({ 
                    taskSorting: {
                      primary: e.target.value as "priority" | "dueDate" | "title" | "created",
                      primaryOrder: formData.taskSorting?.primaryOrder || "desc",
                      secondary: formData.taskSorting?.secondary || "dueDate",
                      secondaryOrder: formData.taskSorting?.secondaryOrder || "asc",
                      tertiary: formData.taskSorting?.tertiary || "title",
                      tertiaryOrder: formData.taskSorting?.tertiaryOrder || "asc"
                    }
                  })}
                  disabled={isUpdating}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:opacity-50"
                >
                  <option value="priority">Priority</option>
                  <option value="dueDate">Due Date</option>
                  <option value="title">Title</option>
                  <option value="created">Created Date</option>
                </select>
              </div>
              <div>
                <label htmlFor="primary-order" className="block text-sm font-medium text-gray-700 mb-2">
                  Order
                </label>
                <select
                  id="primary-order"
                  value={formData.taskSorting?.primaryOrder || "desc"}
                  onChange={(e) => handlePreferenceUpdate({ 
                    taskSorting: {
                      primary: formData.taskSorting?.primary || "priority",
                      primaryOrder: e.target.value as "asc" | "desc",
                      secondary: formData.taskSorting?.secondary || "dueDate",
                      secondaryOrder: formData.taskSorting?.secondaryOrder || "asc",
                      tertiary: formData.taskSorting?.tertiary || "title",
                      tertiaryOrder: formData.taskSorting?.tertiaryOrder || "asc"
                    }
                  })}
                  disabled={isUpdating}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:opacity-50"
                >
                  <option value="asc">Ascending</option>
                  <option value="desc">Descending</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="secondary-sort" className="block text-sm font-medium text-gray-700 mb-2">
                  Secondary Sort
                </label>
                <select
                  id="secondary-sort"
                  value={formData.taskSorting?.secondary || "dueDate"}
                  onChange={(e) => handlePreferenceUpdate({ 
                    taskSorting: {
                      primary: formData.taskSorting?.primary || "priority",
                      primaryOrder: formData.taskSorting?.primaryOrder || "desc",
                      secondary: e.target.value as "priority" | "dueDate" | "title" | "created",
                      secondaryOrder: formData.taskSorting?.secondaryOrder || "asc",
                      tertiary: formData.taskSorting?.tertiary || "title",
                      tertiaryOrder: formData.taskSorting?.tertiaryOrder || "asc"
                    }
                  })}
                  disabled={isUpdating}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:opacity-50"
                >
                  <option value="priority">Priority</option>
                  <option value="dueDate">Due Date</option>
                  <option value="title">Title</option>
                  <option value="created">Created Date</option>
                </select>
              </div>
              <div>
                <label htmlFor="secondary-order" className="block text-sm font-medium text-gray-700 mb-2">
                  Order
                </label>
                <select
                  id="secondary-order"
                  value={formData.taskSorting?.secondaryOrder || "asc"}
                  onChange={(e) => handlePreferenceUpdate({ 
                    taskSorting: {
                      primary: formData.taskSorting?.primary || "priority",
                      primaryOrder: formData.taskSorting?.primaryOrder || "desc",
                      secondary: formData.taskSorting?.secondary || "dueDate",
                      secondaryOrder: e.target.value as "asc" | "desc",
                      tertiary: formData.taskSorting?.tertiary || "title",
                      tertiaryOrder: formData.taskSorting?.tertiaryOrder || "asc"
                    }
                  })}
                  disabled={isUpdating}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:opacity-50"
                >
                  <option value="asc">Ascending</option>
                  <option value="desc">Descending</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="tertiary-sort" className="block text-sm font-medium text-gray-700 mb-2">
                  Tertiary Sort
                </label>
                <select
                  id="tertiary-sort"
                  value={formData.taskSorting?.tertiary || "title"}
                  onChange={(e) => handlePreferenceUpdate({ 
                    taskSorting: {
                      primary: formData.taskSorting?.primary || "priority",
                      primaryOrder: formData.taskSorting?.primaryOrder || "desc",
                      secondary: formData.taskSorting?.secondary || "dueDate",
                      secondaryOrder: formData.taskSorting?.secondaryOrder || "asc",
                      tertiary: e.target.value as "priority" | "dueDate" | "title" | "created",
                      tertiaryOrder: formData.taskSorting?.tertiaryOrder || "asc"
                    }
                  })}
                  disabled={isUpdating}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:opacity-50"
                >
                  <option value="priority">Priority</option>
                  <option value="dueDate">Due Date</option>
                  <option value="title">Title</option>
                  <option value="created">Created Date</option>
                </select>
              </div>
              <div>
                <label htmlFor="tertiary-order" className="block text-sm font-medium text-gray-700 mb-2">
                  Order
                </label>
                <select
                  id="tertiary-order"
                  value={formData.taskSorting?.tertiaryOrder || "asc"}
                  onChange={(e) => handlePreferenceUpdate({ 
                    taskSorting: {
                      primary: formData.taskSorting?.primary || "priority",
                      primaryOrder: formData.taskSorting?.primaryOrder || "desc",
                      secondary: formData.taskSorting?.secondary || "dueDate",
                      secondaryOrder: formData.taskSorting?.secondaryOrder || "asc",
                      tertiary: formData.taskSorting?.tertiary || "title",
                      tertiaryOrder: e.target.value as "asc" | "desc"
                    }
                  })}
                  disabled={isUpdating}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:opacity-50"
                >
                  <option value="asc">Ascending</option>
                  <option value="desc">Descending</option>
                </select>
              </div>
            </div>

            <p className="text-sm text-gray-500">
              Tasks are sorted by the primary field first, then secondary, then tertiary. 
              Default: Priority (higher first) → Due Date (earlier first) → Title (alphabetical).
            </p>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Notifications</h3>
          
          <div className="space-y-4">
            <label className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-gray-900">Email notifications</span>
                <p className="text-sm text-gray-500">Receive email updates about important events</p>
              </div>
              <input
                type="checkbox"
                checked={formData.notifications.email}
                onChange={(e) => handleNotificationUpdate({ email: e.target.checked })}
                disabled={isUpdating}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
              />
            </label>
            
            <label className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-gray-900">Browser notifications</span>
                <p className="text-sm text-gray-500">Show notifications in your browser</p>
              </div>
              <input
                type="checkbox"
                checked={formData.notifications.browser}
                onChange={(e) => handleNotificationUpdate({ browser: e.target.checked })}
                disabled={isUpdating}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
              />
            </label>
            
            <label className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-gray-900">Weekly review reminders</span>
                <p className="text-sm text-gray-500">Get reminded to conduct your weekly GTD review</p>
              </div>
              <input
                type="checkbox"
                checked={formData.notifications.weeklyReview}
                onChange={(e) => handleNotificationUpdate({ weeklyReview: e.target.checked })}
                disabled={isUpdating || !preferencesData?.gtdEnabled}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200">
        <div className="text-sm text-gray-500">
          {hasUnsavedChanges ? "You have unsaved changes" : "All changes saved"}
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveAll}
            disabled={!hasUnsavedChanges || isUpdating}
            className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
              hasUnsavedChanges && !isUpdating
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-gray-400 cursor-not-allowed"
            }`}
          >
            {isUpdating ? "Saving..." : "Save All"}
          </button>
        </div>
      </div>

      {/* GTD Onboarding Modal */}
      {showOnboarding && (
        <GTDOnboarding
          onComplete={handleOnboardingComplete}
          onSkip={handleOnboardingSkip}
        />
      )}
    </>
  )
}