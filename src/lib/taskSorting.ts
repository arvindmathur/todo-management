import { Task, TaskPriority } from "@/types/task"

export interface TaskSortConfig {
  primary: "priority" | "dueDate" | "title" | "created"
  secondary: "priority" | "dueDate" | "title" | "created"
  tertiary: "priority" | "dueDate" | "title" | "created"
}

export const DEFAULT_SORT_CONFIG: TaskSortConfig = {
  primary: "priority",
  secondary: "dueDate",
  tertiary: "title"
}

// Priority order: urgent > high > medium > low
const PRIORITY_ORDER: Record<TaskPriority, number> = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1
}

function comparePriority(a: Task, b: Task): number {
  const aPriority = PRIORITY_ORDER[a.priority] || 0
  const bPriority = PRIORITY_ORDER[b.priority] || 0
  return bPriority - aPriority // Higher priority first
}

function compareDueDate(a: Task, b: Task): number {
  // Tasks with no due date go to the end
  if (!a.dueDate && !b.dueDate) return 0
  if (!a.dueDate) return 1
  if (!b.dueDate) return -1
  
  const aDate = new Date(a.dueDate)
  const bDate = new Date(b.dueDate)
  return aDate.getTime() - bDate.getTime() // Earlier dates first
}

function compareTitle(a: Task, b: Task): number {
  return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })
}

function compareCreated(a: Task, b: Task): number {
  const aDate = new Date(a.createdAt)
  const bDate = new Date(b.createdAt)
  return bDate.getTime() - aDate.getTime() // Newer tasks first
}

function getComparator(field: string) {
  switch (field) {
    case "priority":
      return comparePriority
    case "dueDate":
      return compareDueDate
    case "title":
      return compareTitle
    case "created":
      return compareCreated
    default:
      return compareTitle
  }
}

export function sortTasks(tasks: Task[], config: TaskSortConfig = DEFAULT_SORT_CONFIG): Task[] {
  return [...tasks].sort((a, b) => {
    // Primary sort
    const primaryComparator = getComparator(config.primary)
    const primaryResult = primaryComparator(a, b)
    if (primaryResult !== 0) return primaryResult

    // Secondary sort
    const secondaryComparator = getComparator(config.secondary)
    const secondaryResult = secondaryComparator(a, b)
    if (secondaryResult !== 0) return secondaryResult

    // Tertiary sort
    const tertiaryComparator = getComparator(config.tertiary)
    return tertiaryComparator(a, b)
  })
}

export function getSortLabel(field: string): string {
  switch (field) {
    case "priority":
      return "Priority"
    case "dueDate":
      return "Due Date"
    case "title":
      return "Title"
    case "created":
      return "Created Date"
    default:
      return field
  }
}