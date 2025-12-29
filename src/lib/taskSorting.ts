import { Task, TaskPriority } from "@/types/task"

export interface TaskSortConfig {
  primary: "priority" | "dueDate" | "title" | "created"
  primaryOrder: "asc" | "desc"
  secondary: "priority" | "dueDate" | "title" | "created"
  secondaryOrder: "asc" | "desc"
  tertiary: "priority" | "dueDate" | "title" | "created"
  tertiaryOrder: "asc" | "desc"
}

export const DEFAULT_SORT_CONFIG: TaskSortConfig = {
  primary: "priority",
  primaryOrder: "desc",
  secondary: "dueDate",
  secondaryOrder: "asc",
  tertiary: "title",
  tertiaryOrder: "asc"
}

// Priority order: urgent > high > medium > low
const PRIORITY_ORDER: Record<TaskPriority, number> = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1
}

function comparePriority(a: Task, b: Task, order: "asc" | "desc" = "desc"): number {
  const aPriority = PRIORITY_ORDER[a.priority] || 0
  const bPriority = PRIORITY_ORDER[b.priority] || 0
  const result = bPriority - aPriority // Higher priority first by default
  return order === "asc" ? -result : result
}

function compareDueDate(a: Task, b: Task, order: "asc" | "desc" = "asc"): number {
  // Tasks with no due date go to the end
  if (!a.dueDate && !b.dueDate) return 0
  if (!a.dueDate) return 1
  if (!b.dueDate) return -1
  
  const aDate = new Date(a.dueDate)
  const bDate = new Date(b.dueDate)
  const result = aDate.getTime() - bDate.getTime() // Earlier dates first by default
  return order === "asc" ? result : -result
}

function compareTitle(a: Task, b: Task, order: "asc" | "desc" = "asc"): number {
  const result = a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })
  return order === "asc" ? result : -result
}

function compareCreated(a: Task, b: Task, order: "asc" | "desc" = "desc"): number {
  const aDate = new Date(a.createdAt)
  const bDate = new Date(b.createdAt)
  const result = bDate.getTime() - aDate.getTime() // Newer tasks first by default
  return order === "asc" ? -result : result
}

function getComparator(field: string, order: "asc" | "desc") {
  switch (field) {
    case "priority":
      return (a: Task, b: Task) => comparePriority(a, b, order)
    case "dueDate":
      return (a: Task, b: Task) => compareDueDate(a, b, order)
    case "title":
      return (a: Task, b: Task) => compareTitle(a, b, order)
    case "created":
      return (a: Task, b: Task) => compareCreated(a, b, order)
    default:
      return (a: Task, b: Task) => compareTitle(a, b, order)
  }
}

export function sortTasks(tasks: Task[], config: TaskSortConfig = DEFAULT_SORT_CONFIG): Task[] {
  return [...tasks].sort((a, b) => {
    // Primary sort
    const primaryComparator = getComparator(config.primary, config.primaryOrder)
    const primaryResult = primaryComparator(a, b)
    if (primaryResult !== 0) return primaryResult

    // Secondary sort
    const secondaryComparator = getComparator(config.secondary, config.secondaryOrder)
    const secondaryResult = secondaryComparator(a, b)
    if (secondaryResult !== 0) return secondaryResult

    // Tertiary sort
    const tertiaryComparator = getComparator(config.tertiary, config.tertiaryOrder)
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