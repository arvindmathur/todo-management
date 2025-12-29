export type TaskStatus = "active" | "completed" | "archived"
export type TaskPriority = "low" | "medium" | "high" | "urgent"

export interface Task {
  id: string
  tenantId: string
  userId: string
  title: string
  description?: string
  status: TaskStatus
  priority: TaskPriority
  dueDate?: Date
  originalDueDate?: Date
  completedAt?: Date
  projectId?: string
  contextId?: string
  areaId?: string
  tags: string[]
  createdAt: Date
  updatedAt: Date
  project?: {
    id: string
    name: string
  }
  context?: {
    id: string
    name: string
  }
  area?: {
    id: string
    name: string
  }
}

export interface CreateTaskRequest {
  title: string
  description?: string
  priority?: TaskPriority
  dueDate?: string
  projectId?: string
  contextId?: string
  areaId?: string
  tags?: string[]
}

export interface UpdateTaskRequest {
  title?: string
  description?: string
  priority?: TaskPriority
  dueDate?: string | null
  projectId?: string | null
  contextId?: string | null
  areaId?: string | null
  tags?: string[]
  status?: TaskStatus
}

export interface TaskFilters {
  status?: TaskStatus | "all"
  priority?: TaskPriority
  projectId?: string
  contextId?: string
  areaId?: string
  dueDate?: "today" | "overdue" | "upcoming" | "no-due-date" | "focus"
  search?: string
  limit?: number
  offset?: number
  includeCompleted?: "none" | "1day" | "7days" | "30days"
}

export interface TasksResponse {
  tasks: Task[]
}

export interface TaskResponse {
  task: Task
}