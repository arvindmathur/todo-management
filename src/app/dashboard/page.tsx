"use client"

import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link"
import { useTasks } from "@/hooks/useTasks"
import { useTaskViews } from "@/hooks/useTaskViews"
import { useUserPreferences } from "@/hooks/useUserPreferences"
import { useTaskCounts } from "@/hooks/useTaskCounts"
import { TaskList } from "@/components/tasks/TaskList"
import { TaskViewTabs } from "@/components/tasks/TaskViewTabs"
import { CollapsibleFilters } from "@/components/tasks/CollapsibleFilters"
import { TaskFilters } from "@/types/task"
import VersionDisplay from "@/components/ui/VersionDisplay"

export default function Dashboard() {
  const { data: session, status } = useSession()
  const { preferencesData } = useUserPreferences()
  const router = useRouter()
  const [activeView, setActiveView] = useState("focus")
  const [showAdditionalFilters, setShowAdditionalFilters] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  // Use optimized task counts hook
  const { counts: taskCounts, refreshCounts } = useTaskCounts()

  // Initialize with Focus filter to match the default activeView
  const {
    tasks,
    loading,
    error,
    filters,
    createTask,
    updateTask,
    deleteTask,
    completeTask,
    reopenTask,
    updateFilters,
    clearFilters,
  } = useTasks({ status: "active", dueDate: "focus" })

  const { getTodayTasks, getOverdueTasks, getUpcomingTasks } = useTaskViews()

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
    } else if (status === "authenticated" && session?.user?.email) {
      // Check if user is admin (arvind8mathur@gmail.com)
      setIsAdmin(session.user.email === 'arvind8mathur@gmail.com')
    }
  }, [status, router, session?.user?.email])

  const handleTaskCreate = async (taskData: any) => {
    const result = await createTask(taskData)
    if (result.success) {
      // Refresh task counts after creating a task
      refreshCounts()
    }
    return result
  }

  const handleTaskComplete = async (taskId: string) => {
    const result = await completeTask(taskId)
    if (result.success) {
      // Refresh task counts after completing a task
      refreshCounts()
    }
    return result
  }

  const handleTaskReopen = async (taskId: string) => {
    const result = await reopenTask(taskId)
    if (result.success) {
      // Refresh task counts after reopening a task
      refreshCounts()
    }
    return result
  }

  const handleTaskDelete = async (taskId: string) => {
    const result = await deleteTask(taskId)
    if (result.success) {
      // Refresh task counts after deleting a task
      refreshCounts()
    }
    return result
  }

  const handleViewChange = (view: string, viewFilters: Partial<TaskFilters>) => {
    setActiveView(view)
    
    // Replace all filters with the new ones (don't merge)
    updateFilters(viewFilters, true) // Add a flag to replace instead of merge
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-14">
            <div className="flex items-center">
              <h1 className="text-lg sm:text-xl font-semibold">ToDo Management</h1>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Link
                href="/dashboard/about"
                className="text-gray-700 hover:text-gray-900 px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium"
              >
                <span className="hidden sm:inline">About</span>
                <span className="sm:hidden">?</span>
              </Link>
              <Link
                href="/dashboard/preferences"
                className="text-gray-700 hover:text-gray-900 px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium"
              >
                <span className="hidden sm:inline">Preferences</span>
                <span className="sm:hidden">Prefs</span>
              </Link>
              {isAdmin && (
                <Link
                  href="/admin"
                  className="text-blue-700 hover:text-blue-900 px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium border border-blue-200 hover:border-blue-300"
                >
                  <span className="hidden sm:inline">Admin Panel</span>
                  <span className="sm:hidden">Admin</span>
                </Link>
              )}
              <span className="text-gray-700 text-xs sm:text-sm hidden sm:inline">Welcome, {session.user.name}</span>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="bg-red-600 hover:bg-red-700 text-white px-2 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium"
              >
                <span className="hidden sm:inline">Sign Out</span>
                <span className="sm:hidden">Out</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-4 sm:px-6 lg:px-8">
        <div className="px-4 py-4 sm:px-0">
          {/* Section Header with Tagline */}
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Tasks</h2>
            <p className="text-gray-600">Manage your action items and stay organized</p>
          </div>

          {/* Task View Tabs */}
          <div className="mb-4">
            <TaskViewTabs
              activeView={activeView}
              onViewChange={handleViewChange}
              taskCounts={taskCounts}
              showAdditionalFilters={showAdditionalFilters}
              onToggleAdditionalFilters={() => setShowAdditionalFilters(!showAdditionalFilters)}
              filters={filters}
            />
          </div>

          {/* Collapsible Additional Filters */}
          <CollapsibleFilters
            isOpen={showAdditionalFilters}
            filters={filters}
            onFiltersChange={updateFilters}
            onClearFilters={clearFilters}
            isLoading={loading}
          />

          {/* Results summary */}
          {!loading && (
            <div className="mb-4 text-sm text-gray-600">
              {!tasks || tasks.length === 0 ? (
                "No tasks found"
              ) : (
                `Showing ${tasks.length} task${tasks.length === 1 ? '' : 's'}`
              )}
              {Object.values(filters).some(value => value !== undefined && value !== null && value !== "") && (
                <span className="ml-1">matching your filters</span>
              )}
            </div>
          )}

          {/* Task List */}
          <TaskList
            tasks={tasks || []} // Ensure we always pass an array
            loading={loading}
            error={error}
            onTaskUpdate={updateTask}
            onTaskDelete={handleTaskDelete}
            onTaskComplete={handleTaskComplete}
            onTaskReopen={handleTaskReopen}
            onTaskCreate={handleTaskCreate}
            onTaskCreated={refreshCounts}
          />
        </div>
      </main>
      
      {/* Version Display */}
      <VersionDisplay />
    </div>
  )
}