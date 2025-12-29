"use client"

import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { useTasks } from "@/hooks/useTasks"
import { useTaskViews } from "@/hooks/useTaskViews"
import { TaskList } from "@/components/tasks/TaskList"
import { TaskViewTabs } from "@/components/tasks/TaskViewTabs"
import { CollapsibleFilters } from "@/components/tasks/CollapsibleFilters"
import { TaskFilters } from "@/types/task"
import VersionDisplay from "@/components/ui/VersionDisplay"

export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [activeView, setActiveView] = useState("all")
  const [showAdditionalFilters, setShowAdditionalFilters] = useState(false)
  const [taskCounts, setTaskCounts] = useState({
    all: 0,
    today: 0,
    overdue: 0,
    upcoming: 0,
    noDueDate: 0,
    focus: 0,
  })

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
  } = useTasks()

  const { getTodayTasks, getOverdueTasks, getUpcomingTasks } = useTaskViews()

  // Function to refresh task counts (independent of current filters)
  const refreshTaskCounts = useCallback(async () => {
    if (status !== "authenticated") return
    
    try {
      // Make direct API calls for all counts to ensure independence from current filters
      const [allTasksResponse, todayTasksResponse, overdueTasksResponse, upcomingTasksResponse, noDueDateTasksResponse] = await Promise.all([
        fetch('/api/tasks?status=active').then(res => {
          if (!res.ok) throw new Error('Failed to fetch all tasks')
          return res.json()
        }),
        fetch('/api/tasks/today').then(res => {
          if (!res.ok) throw new Error('Failed to fetch today tasks')
          return res.json()
        }),
        fetch('/api/tasks/overdue').then(res => {
          if (!res.ok) throw new Error('Failed to fetch overdue tasks')
          return res.json()
        }),
        fetch('/api/tasks/upcoming').then(res => {
          if (!res.ok) throw new Error('Failed to fetch upcoming tasks')
          return res.json()
        }),
        fetch('/api/tasks/no-due-date').then(res => {
          if (!res.ok) throw new Error('Failed to fetch no due date tasks')
          return res.json()
        }),
      ])

      // Handle different response formats consistently
      const allTasks = allTasksResponse.data || allTasksResponse.tasks || []
      const todayTasks = todayTasksResponse.data || todayTasksResponse.tasks || []
      const overdueTasks = overdueTasksResponse.data || overdueTasksResponse.tasks || []
      const upcomingTasks = upcomingTasksResponse.data || upcomingTasksResponse.tasks || []
      const noDueDateTasks = noDueDateTasksResponse.data || noDueDateTasksResponse.tasks || []

      setTaskCounts({
        all: allTasksResponse.totalCount || allTasksResponse.total || allTasks.length || 0,
        today: todayTasksResponse.totalCount || todayTasksResponse.total || todayTasks.length || 0,
        overdue: overdueTasksResponse.totalCount || overdueTasksResponse.total || overdueTasks.length || 0,
        upcoming: upcomingTasksResponse.totalCount || upcomingTasksResponse.total || upcomingTasks.length || 0,
        noDueDate: noDueDateTasksResponse.totalCount || noDueDateTasksResponse.total || noDueDateTasks.length || 0,
        focus: (overdueTasksResponse.totalCount || overdueTasksResponse.total || overdueTasks.length || 0) + 
               (todayTasksResponse.totalCount || todayTasksResponse.total || todayTasks.length || 0),
      })
    } catch (err) {
      console.error("Failed to fetch task counts:", err)
      // Set default counts on error
      setTaskCounts({
        all: 0,
        today: 0,
        overdue: 0,
        upcoming: 0,
        noDueDate: 0,
        focus: 0,
      })
    }
  }, [status])

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
    }
  }, [status, router])

  // Fetch task counts for tabs (independent of current filters)
  useEffect(() => {
    if (status === "authenticated") {
      refreshTaskCounts()
    }
  }, [status, refreshTaskCounts])

  const handleTaskCreate = async (taskData: any) => {
    const result = await createTask(taskData)
    if (result.success) {
      // Refresh task counts after creating a task
      refreshTaskCounts()
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
                href="/dashboard/preferences"
                className="text-gray-700 hover:text-gray-900 px-2 sm:px-3 py-2 rounded-md text-xs sm:text-sm font-medium"
              >
                <span className="hidden sm:inline">Preferences</span>
                <span className="sm:hidden">Prefs</span>
              </Link>
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

          {/* Filters */}
          <div className="mb-6">
            <TaskFiltersComponent
              filters={filters}
              onFiltersChange={updateFilters}
              onClearFilters={clearFilters}
              isLoading={loading}
            />
          </div>

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
            onTaskDelete={deleteTask}
            onTaskComplete={completeTask}
            onTaskReopen={reopenTask}
            onTaskCreate={handleTaskCreate}
            onTaskCreated={refreshTaskCounts}
          />
        </div>
      </main>
      
      {/* Version Display */}
      <VersionDisplay />
    </div>
  )
}