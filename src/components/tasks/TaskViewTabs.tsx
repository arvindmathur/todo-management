"use client"

import { TaskFilters } from "@/types/task"

interface TaskViewTabsProps {
  activeView: string
  onViewChange: (view: string, filters: Partial<TaskFilters>) => void
  taskCounts?: {
    all: number
    today: number
    overdue: number
    upcoming: number
    noDueDate: number
  }
}

export function TaskViewTabs({ activeView, onViewChange, taskCounts }: TaskViewTabsProps) {
  const views = [
    {
      id: "all",
      label: "All Tasks",
      filters: { status: "active" as const },
      count: taskCounts?.all,
    },
    {
      id: "today",
      label: "Today",
      filters: { status: "active" as const, dueDate: "today" as const },
      count: taskCounts?.today,
    },
    {
      id: "overdue",
      label: "Overdue",
      filters: { status: "active" as const, dueDate: "overdue" as const },
      count: taskCounts?.overdue,
    },
    {
      id: "upcoming",
      label: "Upcoming",
      filters: { status: "active" as const, dueDate: "upcoming" as const },
      count: taskCounts?.upcoming,
    },
    {
      id: "no-due-date",
      label: "No Due Date",
      filters: { status: "active" as const, dueDate: "no-due-date" as const },
      count: taskCounts?.noDueDate,
    },
  ]

  return (
    <div className="border-b border-gray-200">
      <nav className="-mb-px flex space-x-8" aria-label="Tabs">
        {views.map((view) => (
          <button
            key={view.id}
            onClick={() => onViewChange(view.id, view.filters)}
            className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
              activeView === view.id
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            {view.label}
            {view.count !== undefined && (
              <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                activeView === view.id
                  ? "bg-blue-100 text-blue-600"
                  : "bg-gray-100 text-gray-900"
              }`}>
                {view.count}
              </span>
            )}
          </button>
        ))}
      </nav>
    </div>
  )
}