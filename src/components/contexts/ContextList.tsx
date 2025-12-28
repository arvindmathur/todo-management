"use client"

import { Context } from "@/types/context"
import { ContextItem } from "./ContextItem"

interface ContextListProps {
  contexts: Context[]
  loading: boolean
  error: string | null
  onContextUpdate: (contextId: string, updates: any) => Promise<any>
  onContextDelete: (contextId: string) => Promise<any>
  onInitializeDefaults?: () => Promise<any>
}

export function ContextList({
  contexts,
  loading,
  error,
  onContextUpdate,
  onContextDelete,
  onInitializeDefaults,
}: ContextListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading contexts...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading contexts</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (contexts.length === 0) {
    return (
      <div className="text-center py-12">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No contexts</h3>
        <p className="mt-1 text-sm text-gray-500">
          Get started by creating contexts or initializing default GTD contexts.
        </p>
        {onInitializeDefaults && (
          <div className="mt-4">
            <button
              onClick={onInitializeDefaults}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Initialize Default Contexts
            </button>
          </div>
        )}
      </div>
    )
  }

  // Separate default and custom contexts
  const defaultContexts = contexts.filter(context => context.isDefault)
  const customContexts = contexts.filter(context => !context.isDefault)

  return (
    <div className="space-y-6">
      {/* Default Contexts */}
      {defaultContexts.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3">Default GTD Contexts</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {defaultContexts.map((context) => (
              <ContextItem
                key={context.id}
                context={context}
                onUpdate={onContextUpdate}
                onDelete={onContextDelete}
                compact={true}
              />
            ))}
          </div>
        </div>
      )}

      {/* Custom Contexts */}
      {customContexts.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3">
            Custom Contexts
            {defaultContexts.length > 0 && (
              <span className="ml-2 text-xs text-gray-500">({customContexts.length})</span>
            )}
          </h3>
          <div className="space-y-3">
            {customContexts.map((context) => (
              <ContextItem
                key={context.id}
                context={context}
                onUpdate={onContextUpdate}
                onDelete={onContextDelete}
                compact={false}
              />
            ))}
          </div>
        </div>
      )}

      {/* Initialize defaults if no default contexts exist */}
      {defaultContexts.length === 0 && customContexts.length > 0 && onInitializeDefaults && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-blue-800">Add Default GTD Contexts</h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>Initialize the standard GTD contexts (@phone, @computer, @errands, @home, @office) to get started with context-based organization.</p>
              </div>
              <div className="mt-3">
                <button
                  onClick={onInitializeDefaults}
                  className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Initialize Default Contexts
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}