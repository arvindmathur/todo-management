export type ProjectStatus = "active" | "someday" | "completed" | "archived"

export interface Project {
  id: string
  tenantId: string
  userId: string
  name: string
  description?: string
  status: ProjectStatus
  areaId?: string
  outcome?: string
  nextActionId?: string
  createdAt: Date
  updatedAt: Date
  area?: {
    id: string
    name: string
  }
  tasks?: {
    id: string
    title: string
    description?: string
    status: string
    priority: string
    dueDate?: Date
    completedAt?: Date
    createdAt: Date
  }[]
  progress?: number
  totalTasks?: number
  completedTasks?: number
  shouldBeCompleted?: boolean
  nextAction?: {
    id: string
    title: string
    status: string
    priority: string
    dueDate?: Date
    completedAt?: Date
  } | null
}

export interface CreateProjectRequest {
  name: string
  description?: string
  areaId?: string
  outcome?: string
}

export interface UpdateProjectRequest {
  name?: string
  description?: string
  status?: ProjectStatus
  areaId?: string | null
  outcome?: string
  nextActionId?: string | null
}

export interface ProjectFilters {
  status?: ProjectStatus
  areaId?: string
  limit?: number
  offset?: number
}

export interface ProjectsResponse {
  projects: Project[]
}

export interface ProjectResponse {
  project: Project
}

export interface ProjectDeleteOptions {
  taskAction: "delete" | "unassign" | "move"
  moveToProjectId?: string
}