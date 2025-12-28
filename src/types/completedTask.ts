export interface CompletedTask {
  id: string
  title: string
  description?: string
  status: string
  priority: string
  dueDate?: Date
  completedAt: Date
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
    icon?: string
  }
  area?: {
    id: string
    name: string
    color?: string
  }
}

export interface CompletedTasksResponse {
  tasks: CompletedTask[]
  pagination: {
    page: number
    limit: number
    totalCount: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export interface CompletedTaskStats {
  totalCompleted: number
  recentCompleted: number
  archivedCompleted: number
  thisWeekCompleted: number
  thisMonthCompleted: number
  completedByProject: {
    projectId: string
    projectName: string
    count: number
  }[]
  completedByArea: {
    areaId: string
    areaName: string
    areaColor?: string
    count: number
  }[]
  completedByContext: {
    contextId: string
    contextName: string
    contextIcon?: string
    count: number
  }[]
  retentionInfo: {
    thirtyDaysAgo: string
    ninetyDaysAgo: string
    oneYearAgo: string
  }
}

export interface CompletedTaskFilters {
  search?: string
  projectId?: string
  contextId?: string
  areaId?: string
  dateFrom?: string
  dateTo?: string
  archived?: boolean
  page?: number
  limit?: number
}

export interface BulkDeleteRequest {
  taskIds?: string[]
  olderThanDays?: number
}

export interface BulkDeleteResponse {
  message: string
  deletedCount: number
}

export interface CompletedTaskRetentionPreferences {
  retentionDays: number // 30, 90, 365, or -1 for indefinite
  autoArchive: boolean
  autoDelete: boolean
}