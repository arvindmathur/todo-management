export interface WeeklyReview {
  id: string
  tenantId: string
  userId: string
  startedAt: Date
  completedAt?: Date
  status: "in_progress" | "completed"
  reviewData: {
    projectsReviewed: string[]
    areasReviewed: string[]
    notes?: string
    nextWeekFocus?: string
  }
  createdAt: Date
  updatedAt: Date
}

export interface ReviewProject {
  id: string
  name: string
  description?: string
  status: string
  areaId?: string
  area?: {
    id: string
    name: string
  }
  tasks: {
    id: string
    title: string
    status: string
    priority: string
    dueDate?: Date
    completedAt?: Date
  }[]
  progress: number
  totalTasks: number
  completedTasks: number
  hasNextAction: boolean
  nextAction?: {
    id: string
    title: string
    status: string
    priority: string
    dueDate?: Date
  } | null
  lastActivity?: Date
  needsAttention: boolean
}

export interface ReviewArea {
  id: string
  name: string
  description?: string
  color?: string
  projects: {
    id: string
    name: string
    status: string
    progress: number
  }[]
  tasks: {
    id: string
    title: string
    status: string
    priority: string
    dueDate?: Date
    completedAt?: Date
  }[]
  recentActivity: {
    type: "task_completed" | "task_created" | "project_completed" | "project_created"
    date: Date
    description: string
  }[]
  needsAttention: boolean
  attentionReasons: string[]
}

export interface ReviewSession {
  id: string
  projects: ReviewProject[]
  areas: ReviewArea[]
  summary: {
    totalProjects: number
    activeProjects: number
    projectsNeedingAttention: number
    totalAreas: number
    areasNeedingAttention: number
    completedTasksThisWeek: number
    overdueTasks: number
  }
  lastReviewDate?: Date
  daysSinceLastReview?: number
}

export interface CreateWeeklyReviewRequest {
  notes?: string
  nextWeekFocus?: string
}

export interface UpdateWeeklyReviewRequest {
  projectsReviewed?: string[]
  areasReviewed?: string[]
  notes?: string
  nextWeekFocus?: string
  status?: "in_progress" | "completed"
}

export interface WeeklyReviewResponse {
  review: WeeklyReview
}

export interface ReviewSessionResponse {
  session: ReviewSession
  currentReview?: WeeklyReview
}

export interface ReviewStatsResponse {
  lastReviewDate?: Date
  daysSinceLastReview?: number
  isOverdue: boolean
  nextReviewDue: Date
  reviewStreak: number
  totalReviews: number
}