export interface InboxItem {
  id: string
  tenantId: string
  userId: string
  content: string
  processed: boolean
  processedAt?: Date
  createdAt: Date
}

export interface CreateInboxItemRequest {
  content: string
}

export interface UpdateInboxItemRequest {
  content?: string
}

export interface ProcessInboxItemRequest {
  action: "convert_to_task" | "convert_to_project" | "mark_as_reference" | "delete"
  taskData?: {
    title: string
    description?: string
    priority?: "low" | "medium" | "high" | "urgent"
    dueDate?: string
    projectId?: string
    contextId?: string
    areaId?: string
    tags?: string[]
  }
  projectData?: {
    name: string
    description?: string
    areaId?: string
    outcome?: string
  }
  referenceNote?: string
}

export interface InboxFilters {
  processed?: boolean
  search?: string
  limit?: number
  offset?: number
}

export interface InboxItemsResponse {
  inboxItems: InboxItem[]
  unprocessedCount: number
  total: number
}

export interface InboxItemResponse {
  inboxItem: InboxItem
}

export interface InboxCountResponse {
  unprocessedCount: number
  processedCount: number
  totalCount: number
  processingRate: number
}

export interface ProcessInboxItemResponse {
  message: string
  action: string
  result: {
    task?: any
    project?: any
    type: "task" | "project" | "reference" | "deleted"
    note?: string
  }
  processedItem?: InboxItem | null
  unprocessedCount: number
}