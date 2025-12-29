"use client"

import React from "react"

interface CompletedTaskToggleProps {
  includeCompleted: "none" | "1day" | "7days" | "30days"
  onToggle: (value: "none" | "1day" | "7days" | "30days") => void
}

export const CompletedTaskToggle = React.memo(function CompletedTaskToggle({
  includeCompleted,
  onToggle,
}: CompletedTaskToggleProps) {
  const options = [
    { value: "none" as const, label: "Hide Completed" },
    { value: "1day" as const, label: "Last 1 Day" },
    { value: "7days" as const, label: "Last 7 Days" },
    { value: "30days" as const, label: "Last 30 Days" },
  ]

  return (
    <div className="flex items-center space-x-2">
      <span className="text-sm text-gray-600 font-medium">Completed:</span>
      <div className="flex bg-gray-100 rounded-md p-1">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => onToggle(option.value)}
            className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
              includeCompleted === option.value
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
})