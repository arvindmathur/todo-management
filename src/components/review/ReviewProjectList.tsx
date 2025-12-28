"use client"

import { useState } from "react"
import { ReviewProject } from "@/types/review"

interface ReviewProjectListProps {
  projects: ReviewProject[]
  reviewedProjects: string[]
  onMarkReviewed: (projectId: string) => Promise<any>
}

export function ReviewProjectList({ 
  projects, 
  reviewedProjects, 
  onMarkReviewed 
}: ReviewProjectListProps) {
  const [expandedProject, setExpandedProject] = useState<string | null>(null)

  const handleMarkReviewed = async (projectId: string) => {
    await onMarkReviewed(projectId)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800"
      case "someday":
        return "bg-yellow-100 text-yellow-800"
      case "completed":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "text-red-600"
      case "high":
        return "text-orange-600"
      case "medium":
        return "text-yellow-600"
      case "low":
        return "text-green-600"
      default:
        return "text-gray-600"
    }
  }

  if (projects.length === 0) {
    return (
      <div className="text-center py-8">
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
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No projects to review</h3>
        <p className="mt-1 text-sm text-gray-500">
          You don't have any active projects at the moment.
        </p>
      </div>
    )
  }

  // Separate projects by attention needed
  const projectsNeedingAttention = projects.filter(p => p.needsAttention)
  const otherProjects = projects.filter(p => !p.needsAttention)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Project Review</h3>
        <div className="text-sm text-gray-500">
          {reviewedProjects.length} of {projects.length} reviewed
        </div>
      </div>

      {/* Projects Needing Attention */}
      {projectsNeedingAttention.length > 0 && (
        <div>
          <h4 className="text-md font-medium text-red-800 mb-3 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            Projects Needing Attention ({projectsNeedingAttention.length})
          </h4>
          <div className="space-y-3">
            {projectsNeedingAttention.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                isReviewed={reviewedProjects.includes(project.id)}
                isExpanded={expandedProject === project.id}
                onToggleExpand={() => setExpandedProject(
                  expandedProject === project.id ? null : project.id
                )}
                onMarkReviewed={() => handleMarkReviewed(project.id)}
                getStatusColor={getStatusColor}
                getPriorityColor={getPriorityColor}
                needsAttention={true}
              />
            ))}
          </div>
        </div>
      )}

      {/* Other Projects */}
      {otherProjects.length > 0 && (
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-3">
            Other Projects ({otherProjects.length})
          </h4>
          <div className="space-y-3">
            {otherProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                isReviewed={reviewedProjects.includes(project.id)}
                isExpanded={expandedProject === project.id}
                onToggleExpand={() => setExpandedProject(
                  expandedProject === project.id ? null : project.id
                )}
                onMarkReviewed={() => handleMarkReviewed(project.id)}
                getStatusColor={getStatusColor}
                getPriorityColor={getPriorityColor}
                needsAttention={false}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

interface ProjectCardProps {
  project: ReviewProject
  isReviewed: boolean
  isExpanded: boolean
  onToggleExpand: () => void
  onMarkReviewed: () => void
  getStatusColor: (status: string) => string
  getPriorityColor: (priority: string) => string
  needsAttention: boolean
}

function ProjectCard({
  project,
  isReviewed,
  isExpanded,
  onToggleExpand,
  onMarkReviewed,
  getStatusColor,
  getPriorityColor,
  needsAttention
}: ProjectCardProps) {
  return (
    <div className={`border rounded-lg p-4 ${
      needsAttention ? "border-red-200 bg-red-50" : "border-gray-200 bg-white"
    } ${isReviewed ? "opacity-75" : ""}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-3 mb-2">
            <h5 className="font-medium text-gray-900">{project.name}</h5>
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
              {project.status}
            </span>
            {project.area && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                {project.area.name}
              </span>
            )}
          </div>

          {project.description && (
            <p className="text-sm text-gray-600 mb-3">{project.description}</p>
          )}

          {/* Progress */}
          <div className="flex items-center space-x-4 mb-3">
            <div className="flex-1">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-600">Progress</span>
                <span className="font-medium">{Math.round(project.progress)}%</span>
              </div>
              <div className="bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${project.progress}%` }}
                />
              </div>
            </div>
            <div className="text-sm text-gray-500">
              {project.completedTasks} / {project.totalTasks} tasks
            </div>
          </div>

          {/* Next Action */}
          {project.nextAction ? (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-900">Next Action</p>
                  <p className="text-sm text-blue-800">{project.nextAction.title}</p>
                </div>
                <span className={`text-sm font-medium ${getPriorityColor(project.nextAction.priority)}`}>
                  {project.nextAction.priority}
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-3">
              <p className="text-sm font-medium text-yellow-800">⚠️ No next action defined</p>
              <p className="text-sm text-yellow-700">Consider adding a next action to move this project forward.</p>
            </div>
          )}

          {/* Attention Reasons */}
          {needsAttention && (
            <div className="bg-red-100 border border-red-200 rounded-md p-3 mb-3">
              <p className="text-sm font-medium text-red-800">Needs Attention:</p>
              <ul className="text-sm text-red-700 mt-1 list-disc list-inside">
                {!project.hasNextAction && <li>No next action defined</li>}
                {project.lastActivity && new Date(project.lastActivity) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) && (
                  <li>No activity in the last week</li>
                )}
                {project.status === "active" && project.tasks.length === 0 && (
                  <li>Active project with no tasks</li>
                )}
              </ul>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2 ml-4">
          <button
            onClick={onToggleExpand}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title={isExpanded ? "Collapse" : "Expand"}
          >
            <svg className={`w-5 h-5 transform transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          <button
            onClick={onMarkReviewed}
            disabled={isReviewed}
            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
              isReviewed
                ? "bg-green-100 text-green-800 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            {isReviewed ? "✓ Reviewed" : "Mark Reviewed"}
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h6 className="font-medium text-gray-900 mb-2">Active Tasks ({project.tasks.length})</h6>
          {project.tasks.length > 0 ? (
            <div className="space-y-2">
              {project.tasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{task.title}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={`text-xs font-medium ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                      {task.dueDate && (
                        <span className="text-xs text-gray-500">
                          Due: {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                    {task.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No active tasks</p>
          )}
        </div>
      )}
    </div>
  )
}