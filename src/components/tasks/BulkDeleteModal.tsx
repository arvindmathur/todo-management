"use client"

import { useState } from "react"

interface BulkDeleteModalProps {
  selectedCount: number
  onConfirm: (olderThanDays?: number) => Promise<void>
  onCancel: () => void
}

export function BulkDeleteModal({ selectedCount, onConfirm, onCancel }: BulkDeleteModalProps) {
  const [deleteOption, setDeleteOption] = useState<"selected" | "older">(
    selectedCount > 0 ? "selected" : "older"
  )
  const [olderThanDays, setOlderThanDays] = useState(90)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleConfirm = async () => {
    setIsDeleting(true)
    try {
      if (deleteOption === "selected") {
        await onConfirm()
      } else {
        await onConfirm(olderThanDays)
      }
    } finally {
      setIsDeleting(false)
    }
  }

  const deleteOptions = [
    { value: 30, label: "30 days" },
    { value: 90, label: "90 days" },
    { value: 180, label: "6 months" },
    { value: 365, label: "1 year" },
  ]

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          {/* Header */}
          <div className="flex items-center">
            <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
          </div>

          <div className="mt-3 text-center">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Delete Completed Tasks
            </h3>
            <div className="mt-4 text-left">
              <p className="text-sm text-gray-500 mb-4">
                This action cannot be undone. Please choose what you want to delete:
              </p>

              <div className="space-y-3">
                {/* Delete Selected Option */}
                {selectedCount > 0 && (
                  <div className="flex items-center">
                    <input
                      id="delete-selected"
                      name="delete-option"
                      type="radio"
                      checked={deleteOption === "selected"}
                      onChange={() => setDeleteOption("selected")}
                      className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300"
                    />
                    <label htmlFor="delete-selected" className="ml-3 block text-sm font-medium text-gray-700">
                      Delete selected tasks ({selectedCount} tasks)
                    </label>
                  </div>
                )}

                {/* Delete Older Option */}
                <div className="flex items-center">
                  <input
                    id="delete-older"
                    name="delete-option"
                    type="radio"
                    checked={deleteOption === "older"}
                    onChange={() => setDeleteOption("older")}
                    className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300"
                  />
                  <label htmlFor="delete-older" className="ml-3 block text-sm font-medium text-gray-700">
                    Delete tasks older than:
                  </label>
                </div>

                {/* Days Selection */}
                {deleteOption === "older" && (
                  <div className="ml-7">
                    <select
                      value={olderThanDays}
                      onChange={(e) => setOlderThanDays(Number(e.target.value))}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                    >
                      {deleteOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Warning */}
              <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-md p-3">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700">
                      <strong>Warning:</strong> This action is permanent and cannot be undone. 
                      Deleted tasks will be completely removed from your account.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex space-x-3">
            <button
              onClick={onCancel}
              disabled={isDeleting}
              className="flex-1 px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={isDeleting}
              className="flex-1 px-4 py-2 bg-red-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
            >
              {isDeleting ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Deleting...
                </div>
              ) : (
                "Delete Tasks"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}