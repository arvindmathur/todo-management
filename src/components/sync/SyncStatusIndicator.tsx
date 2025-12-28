"use client"

import { useSync } from "@/hooks/useSync"

export function SyncStatusIndicator() {
  const { getSyncStatus, forceSync, lastSync } = useSync()
  const status = getSyncStatus()

  const getStatusIcon = () => {
    switch (status.status) {
      case "offline":
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-12.728 12.728m0 0L12 12m-6.364 6.364L12 12m6.364-6.364L12 12" />
          </svg>
        )
      case "disconnected":
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        )
      case "syncing":
        return (
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )
      case "pending":
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case "synced":
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      default:
        return null
    }
  }

  const getStatusColor = () => {
    switch (status.color) {
      case "green":
        return "text-green-600 bg-green-100"
      case "blue":
        return "text-blue-600 bg-blue-100"
      case "yellow":
        return "text-yellow-600 bg-yellow-100"
      case "orange":
        return "text-orange-600 bg-orange-100"
      case "red":
        return "text-red-600 bg-red-100"
      default:
        return "text-gray-600 bg-gray-100"
    }
  }

  const formatLastSync = () => {
    if (!lastSync) return "Never"
    
    const now = Date.now()
    const diff = now - lastSync
    
    if (diff < 60000) return "Just now"
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return `${Math.floor(diff / 86400000)}d ago`
  }

  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={forceSync}
        disabled={status.status === "syncing" || status.status === "offline"}
        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium transition-colors ${getStatusColor()} hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed`}
        title={`${status.message} - Last sync: ${formatLastSync()}`}
      >
        {getStatusIcon()}
        <span className="ml-1 hidden sm:inline">{status.message}</span>
      </button>
    </div>
  )
}

export function SyncStatusBanner() {
  const { getSyncStatus, forceSync } = useSync()
  const status = getSyncStatus()

  // Only show banner for important status changes
  if (status.status === "synced" || status.status === "syncing") {
    return null
  }

  return (
    <div className={`border-l-4 p-4 ${
      status.color === "red" ? "bg-red-50 border-red-400" :
      status.color === "yellow" ? "bg-yellow-50 border-yellow-400" :
      status.color === "orange" ? "bg-orange-50 border-orange-400" :
      "bg-gray-50 border-gray-400"
    }`}>
      <div className="flex">
        <div className="flex-shrink-0">
          {status.status === "offline" ? (
            <svg className={`h-5 w-5 ${
              status.color === "red" ? "text-red-400" :
              status.color === "yellow" ? "text-yellow-400" :
              status.color === "orange" ? "text-orange-400" :
              "text-gray-400"
            }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-12.728 12.728m0 0L12 12m-6.364 6.364L12 12m6.364-6.364L12 12" />
            </svg>
          ) : (
            <svg className={`h-5 w-5 ${
              status.color === "red" ? "text-red-400" :
              status.color === "yellow" ? "text-yellow-400" :
              status.color === "orange" ? "text-orange-400" :
              "text-gray-400"
            }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          )}
        </div>
        <div className="ml-3">
          <p className={`text-sm ${
            status.color === "red" ? "text-red-800" :
            status.color === "yellow" ? "text-yellow-800" :
            status.color === "orange" ? "text-orange-800" :
            "text-gray-800"
          }`}>
            {status.message}
          </p>
          {status.status === "disconnected" && (
            <div className="mt-2">
              <button
                onClick={forceSync}
                className={`text-sm font-medium ${
                  status.color === "red" ? "text-red-800 hover:text-red-900" :
                  status.color === "yellow" ? "text-yellow-800 hover:text-yellow-900" :
                  status.color === "orange" ? "text-orange-800 hover:text-orange-900" :
                  "text-gray-800 hover:text-gray-900"
                } underline`}
              >
                Try to reconnect
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}