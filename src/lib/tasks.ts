import { Task, TaskPriority, TaskStatus } from "@/types/task"
import { prisma } from "./prisma"
import { DatabaseConnection } from "./db-connection"
import { TimezoneService } from "./timezone-service"

// Project-related types
export interface Project {
  id: string
  name: string
  description?: string
  status: "active" | "someday" | "completed" | "archived"
  areaId?: string
  outcome?: string
  nextActionId?: string
  createdAt: Date
  updatedAt: Date
  tasks?: Task[]
  area?: { id: string; name: string }
  progress?: number
  totalTasks?: number
  completedTasks?: number
}

export function getPriorityColor(priority: TaskPriority): string {
  switch (priority) {
    case "urgent":
      return "text-red-600 bg-red-100"
    case "high":
      return "text-orange-600 bg-orange-100"
    case "medium":
      return "text-yellow-600 bg-yellow-100"
    case "low":
      return "text-green-600 bg-green-100"
    default:
      return "text-gray-600 bg-gray-100"
  }
}

export function getPriorityLabel(priority: TaskPriority): string {
  switch (priority) {
    case "urgent":
      return "Urgent"
    case "high":
      return "High"
    case "medium":
      return "Medium"
    case "low":
      return "Low"
    default:
      return priority
  }
}

export function getStatusColor(status: TaskStatus): string {
  switch (status) {
    case "active":
      return "text-blue-600 bg-blue-100"
    case "completed":
      return "text-green-600 bg-green-100"
    case "archived":
      return "text-gray-600 bg-gray-100"
    default:
      return "text-gray-600 bg-gray-100"
  }
}

export function getStatusLabel(status: TaskStatus): string {
  switch (status) {
    case "active":
      return "Active"
    case "completed":
      return "Completed"
    case "archived":
      return "Archived"
    default:
      return status
  }
}

export async function isTaskOverdue(task: Task, userId: string): Promise<boolean> {
  if (!task.dueDate || task.status === "completed") return false
  
  try {
    // Get user's timezone and current date boundaries
    const boundaries = await TimezoneService.getDateBoundaries(userId)
    const taskDueTime = new Date(task.dueDate).getTime()
    
    // Task is overdue if due before today in user's timezone
    return taskDueTime < boundaries.todayStart.getTime()
  } catch (error) {
    console.error('Error checking if task is overdue:', error)
    // Fallback to server timezone
    const now = new Date()
    const dueDate = new Date(task.dueDate)
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const taskDueDate = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate())
    return taskDueDate < today
  }
}

export async function isTaskDueToday(task: Task, userId: string): Promise<boolean> {
  if (!task.dueDate) return false
  
  try {
    // Get user's timezone and current date boundaries
    const boundaries = await TimezoneService.getDateBoundaries(userId)
    const taskDueTime = new Date(task.dueDate).getTime()
    
    // Task is due today if within today's boundaries in user's timezone
    return taskDueTime >= boundaries.todayStart.getTime() && 
           taskDueTime < boundaries.todayEnd.getTime()
  } catch (error) {
    console.error('Error checking if task is due today:', error)
    // Fallback to server timezone
    const now = new Date()
    const dueDate = new Date(task.dueDate)
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const taskDueDate = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate())
    return taskDueDate.getTime() === today.getTime()
  }
}

export async function isTaskUpcoming(task: Task, userId: string): Promise<boolean> {
  if (!task.dueDate) return false
  
  try {
    // Get user's timezone and current date boundaries
    const boundaries = await TimezoneService.getDateBoundaries(userId)
    const taskDueTime = new Date(task.dueDate).getTime()
    
    // Task is upcoming if due after today but within the next week in user's timezone
    return taskDueTime >= boundaries.tomorrowStart.getTime() && 
           taskDueTime < boundaries.weekFromNow.getTime()
  } catch (error) {
    console.error('Error checking if task is upcoming:', error)
    // Fallback to server timezone
    const now = new Date()
    const dueDate = new Date(task.dueDate)
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const taskDueDate = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate())
    return taskDueDate > today
  }
}

// Timezone-unaware versions for client-side use (backward compatibility)
export function isTaskOverdueLocal(task: Task): boolean {
  if (!task.dueDate) return false
  
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const taskDueDate = new Date(task.dueDate.getFullYear(), task.dueDate.getMonth(), task.dueDate.getDate())
  
  return taskDueDate < today
}

export function isTaskDueTodayLocal(task: Task): boolean {
  if (!task.dueDate) return false
  
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const taskDueDate = new Date(task.dueDate.getFullYear(), task.dueDate.getMonth(), task.dueDate.getDate())
  
  return taskDueDate.getTime() === today.getTime()
}

export function isTaskUpcomingLocal(task: Task): boolean {
  if (!task.dueDate) return false
  
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const taskDueDate = new Date(task.dueDate.getFullYear(), task.dueDate.getMonth(), task.dueDate.getDate())
  
  return taskDueDate > today
}

export function formatDueDate(dueDate: Date): string {
  const now = new Date()
  const due = new Date(dueDate)
  
  // Check if it's today (using local timezone)
  if (isTaskDueTodayLocal({ dueDate } as Task)) {
    return "Today"
  }
  
  // Check if it's tomorrow
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowDate = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate())
  const taskDueDate = new Date(due.getFullYear(), due.getMonth(), due.getDate())
  
  if (taskDueDate.getTime() === tomorrowDate.getTime()) {
    return "Tomorrow"
  }
  
  // Check if it's yesterday
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate())
  
  if (taskDueDate.getTime() === yesterdayDate.getTime()) {
    return "Yesterday"
  }
  
  // Check if it's this week
  const daysDiff = Math.floor((taskDueDate.getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / (1000 * 60 * 60 * 24))
  
  if (daysDiff >= -7 && daysDiff <= 7) {
    return due.toLocaleDateString('en-US', { weekday: 'long' })
  }
  
  // Default format
  return due.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: due.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  })
}

export function sortTasksByPriority(tasks: Task[]): Task[] {
  const priorityOrder: Record<TaskPriority, number> = {
    urgent: 4,
    high: 3,
    medium: 2,
    low: 1,
  }
  
  return [...tasks].sort((a, b) => {
    // First sort by priority
    const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
    if (priorityDiff !== 0) return priorityDiff
    
    // Then by due date (overdue first, then by date)
    if (a.dueDate && b.dueDate) {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    }
    if (a.dueDate && !b.dueDate) return -1
    if (!a.dueDate && b.dueDate) return 1
    
    // Finally by creation date (newest first)
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
}

export function filterTasks(tasks: Task[], filters: {
  search?: string
  priority?: TaskPriority
  status?: TaskStatus
  dueDate?: "today" | "overdue" | "upcoming"
  projectId?: string
  contextId?: string
  areaId?: string
  tags?: string[]
}): Task[] {
  return tasks.filter(task => {
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      const matchesTitle = task.title.toLowerCase().includes(searchLower)
      const matchesDescription = task.description?.toLowerCase().includes(searchLower)
      const matchesTags = task.tags.some(tag => tag.toLowerCase().includes(searchLower))
      const matchesProject = task.project?.name.toLowerCase().includes(searchLower)
      const matchesContext = task.context?.name.toLowerCase().includes(searchLower)
      const matchesArea = task.area?.name.toLowerCase().includes(searchLower)
      
      if (!matchesTitle && !matchesDescription && !matchesTags && !matchesProject && !matchesContext && !matchesArea) {
        return false
      }
    }
    
    // Priority filter
    if (filters.priority && task.priority !== filters.priority) {
      return false
    }
    
    // Status filter
    if (filters.status && task.status !== filters.status) {
      return false
    }
    
    // Project filter
    if (filters.projectId && task.projectId !== filters.projectId) {
      return false
    }
    
    // Context filter
    if (filters.contextId && task.contextId !== filters.contextId) {
      return false
    }
    
    // Area filter
    if (filters.areaId && task.areaId !== filters.areaId) {
      return false
    }
    
    // Tags filter
    if (filters.tags && filters.tags.length > 0) {
      const hasMatchingTag = filters.tags.some(filterTag => 
        task.tags.some(taskTag => taskTag.toLowerCase().includes(filterTag.toLowerCase()))
      )
      if (!hasMatchingTag) return false
    }
    
    // Due date filter
    if (filters.dueDate) {
      switch (filters.dueDate) {
        case "today":
          if (!isTaskDueTodayLocal(task)) return false
          break
        case "overdue":
          if (!isTaskOverdueLocal(task)) return false
          break
        case "upcoming":
          if (!isTaskUpcomingLocal(task)) return false
          break
      }
    }
    
    return true
  })
}

export function getTaskCounts(tasks: Task[]): {
  total: number
  active: number
  completed: number
  overdue: number
  dueToday: number
  upcoming: number
} {
  const active = tasks.filter(t => t.status === "active")
  
  return {
    total: tasks.length,
    active: active.length,
    completed: tasks.filter(t => t.status === "completed").length,
    overdue: active.filter(isTaskOverdueLocal).length,
    dueToday: active.filter(isTaskDueTodayLocal).length,
    upcoming: active.filter(isTaskUpcomingLocal).length,
  }
}

export function groupTasksByDate(tasks: Task[]): Record<string, Task[]> {
  const groups: Record<string, Task[]> = {}
  
  tasks.forEach(task => {
    let groupKey = "No Due Date"
    
    if (task.dueDate) {
      if (isTaskOverdueLocal(task)) {
        groupKey = "Overdue"
      } else if (isTaskDueTodayLocal(task)) {
        groupKey = "Today"
      } else if (isTaskUpcomingLocal(task)) {
        groupKey = formatDueDate(task.dueDate)
      }
    }
    
    if (!groups[groupKey]) {
      groups[groupKey] = []
    }
    groups[groupKey].push(task)
  })
  
  return groups
}

export function groupTasksByPriority(tasks: Task[]): Record<TaskPriority, Task[]> {
  const groups: Record<TaskPriority, Task[]> = {
    urgent: [],
    high: [],
    medium: [],
    low: [],
  }
  
  tasks.forEach(task => {
    groups[task.priority].push(task)
  })
  
  return groups
}

// Project utility functions
export function calculateProjectProgress(tasks: Task[]): {
  progress: number
  totalTasks: number
  completedTasks: number
  activeTasks: number
} {
  const totalTasks = tasks.length
  const completedTasks = tasks.filter(task => task.status === "completed").length
  const activeTasks = tasks.filter(task => task.status === "active").length
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
  
  return {
    progress,
    totalTasks,
    completedTasks,
    activeTasks
  }
}

export function shouldProjectBeCompleted(tasks: Task[]): boolean {
  if (tasks.length === 0) return false
  return tasks.every(task => task.status === "completed")
}

export function getProjectNextAction(tasks: Task[]): Task | null {
  // Find the highest priority active task
  const activeTasks = tasks.filter(task => task.status === "active")
  if (activeTasks.length === 0) return null
  
  return sortTasksByPriority(activeTasks)[0]
}

export async function updateProjectCompletion(projectId: string, userId: string, tenantId: string): Promise<void> {
  try {
    // Get project with tasks
    const project = await DatabaseConnection.withRetry(
      () => prisma.project.findFirst({
        where: {
          id: projectId,
          userId,
          tenantId,
        },
        include: {
          tasks: {
            select: {
              id: true,
              status: true,
            }
          }
        }
      }),
      'get-project-for-completion-update'
    )

    if (!project) return

    const shouldComplete = project.tasks.length > 0 && project.tasks.every(task => task.status === "completed")
    
    // Auto-complete project if all tasks are done and project is still active
    if (shouldComplete && project.status === "active") {
      await DatabaseConnection.withRetry(
        () => prisma.project.update({
          where: { id: projectId },
          data: { 
            status: "completed",
            updatedAt: new Date()
          }
        }),
        'complete-project'
      )
    }
    // Reopen project if it was completed but now has active tasks
    else if (!shouldComplete && project.status === "completed") {
      await DatabaseConnection.withRetry(
        () => prisma.project.update({
          where: { id: projectId },
          data: { 
            status: "active",
            updatedAt: new Date()
          }
        }),
        'reopen-project'
      )
    }
  } catch (error) {
    console.error("Error updating project completion:", error)
    // Don't throw - this is a background operation
  }
}

export function getProjectStatusColor(status: "active" | "someday" | "completed" | "archived"): string {
  switch (status) {
    case "active":
      return "text-blue-600 bg-blue-100"
    case "someday":
      return "text-purple-600 bg-purple-100"
    case "completed":
      return "text-green-600 bg-green-100"
    case "archived":
      return "text-gray-600 bg-gray-100"
    default:
      return "text-gray-600 bg-gray-100"
  }
}

export function getProjectStatusLabel(status: "active" | "someday" | "completed" | "archived"): string {
  switch (status) {
    case "active":
      return "Active"
    case "someday":
      return "Someday/Maybe"
    case "completed":
      return "Completed"
    case "archived":
      return "Archived"
    default:
      return status
  }
}