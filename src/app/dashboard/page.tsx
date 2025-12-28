"use client"

import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { useTasks } from "@/hooks/useTasks"
import { useTaskViews } from "@/hooks/useTaskViews"
import { TaskList } from "@/components/tasks/TaskList"
import { TaskCreateForm } from "@/components/tasks/TaskCreateForm"
import { TaskFiltersComponent } from "@/components/tasks/TaskFilters"
import { TaskViewTabs } from "@/components/tasks/TaskViewTabs"
import { TaskFilters } from "@/types/task"

export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [activeView, setActiveView] = useState("all")
  const [taskCounts, setTaskCounts] = useState({
    all: 0,
    today: 0,
    overdue: 0,
    upcoming: 0,
    noDueDate: 0,
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

      const allTasks = allTasksResponse.data || allTasksResponse.tasks || []
      const todayTasks = todayTasksResponse.tasks || []
      const overdueTasks = overdueTasksResponse.tasks || []
      const upcomingTasks = upcomingTasksResponse.tasks || []
      const noDueDateTasks = noDueDateTasksResponse.tasks || []

      setTaskCounts({
        all: allTasks.length || 0,
        today: todayTasks.length || 0,
        overdue: overdueTasks.length || 0,
        upcoming: upcomingTasks.length || 0,
        noDueDate: noDueDateTasks.length || 0,
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

  const handleViewChange = (view: string, viewFilters: Partial<TaskFilters>) => {
    setActiveView(view)
    
    // Replace all filters with the new ones (don't merge)
    updateFilters(viewFilters, true) // Add a flag to replace instead of merge
  }

  const handleCreateTask = async (taskData: any) => {
    const result = await createTask(taskData)
    if (result.success) {
      setShowCreateForm(false)
      // Refresh task counts after creating a task
      refreshTaskCounts()
    }
    return result
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
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold">Todo Management</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard/preferences"
                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Preferences
              </Link>
              <span className="text-gray-700">Welcome, {session.user.name}</span>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header with Create Task Button */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Tasks</h2>
              <p className="text-gray-600">Manage your tasks and stay organized</p>
            </div>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Task
            </button>
          </div>

          {/* Create Task Form */}
          {showCreateForm && (
            <div className="mb-6">
              <TaskCreateForm
                onSubmit={handleCreateTask}
                onCancel={() => setShowCreateForm(false)}
                isLoading={loading}
              />
            </div>
          )}

          {/* Task View Tabs */}
          <div className="mb-6">
            <TaskViewTabs
              activeView={activeView}
              onViewChange={handleViewChange}
              taskCounts={taskCounts}
            />
          </div>

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
          />
        </div>
      </main>
    </div>
  )
}