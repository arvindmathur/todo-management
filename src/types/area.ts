export interface Area {
  id: string
  tenantId: string
  userId: string
  name: string
  description?: string
  color?: string
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
  projects?: {
    id: string
    name: string
    description?: string
    status: string
    outcome?: string
    createdAt: Date
  }[]
  _count?: {
    tasks: number
    projects: number
  }
}

export interface CreateAreaRequest {
  name: string
  description?: string
  color?: string
}

export interface UpdateAreaRequest {
  name?: string
  description?: string
  color?: string
}

export interface AreaFilters {
  search?: string
  limit?: number
  offset?: number
}

export interface AreasResponse {
  areas: Area[]
}

export interface AreaResponse {
  area: Area
}