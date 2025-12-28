export interface Context {
  id: string
  tenantId: string
  userId: string
  name: string
  description?: string
  icon?: string
  isDefault: boolean
  createdAt: Date
  tasks?: {
    id: string
    title: string
    description?: string
    status: string
    priority: string
    dueDate?: Date
    createdAt: Date
  }[]
  _count?: {
    tasks: number
  }
}

export interface CreateContextRequest {
  name: string
  description?: string
  icon?: string
}

export interface UpdateContextRequest {
  name?: string
  description?: string
  icon?: string
}

export interface ContextFilters {
  search?: string
  isDefault?: boolean
  limit?: number
  offset?: number
}

export interface ContextsResponse {
  contexts: Context[]
}

export interface ContextResponse {
  context: Context
}