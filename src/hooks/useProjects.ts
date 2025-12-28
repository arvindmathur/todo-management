"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { Project, ProjectFilters, CreateProjectRequest, UpdateProjectRequest, ProjectDeleteOptions } from "@/types/project"

export function useProjects(initialFilters: ProjectFilters = {}) {
  const { data: session, status } = useSession()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<ProjectFilters>(initialFilters)

  const fetchProjects = useCallback(async (currentFilters: ProjectFilters = filters) => {
    if (status !== "authenticated") return

    try {
      setLoading(true)
      const searchParams = new URLSearchParams()
      
      Object.entries(currentFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          searchParams.append(key, value.toString())
        }
      })

      const response = await fetch(`/api/projects?${searchParams.toString()}`)
      
      if (response.ok) {
        const data = await response.json()
        setProjects(data.projects)
        setError(null)
      } else {
        const errorData = await response.json()
        setError(errorData.error || "Failed to load projects")
      }
    } catch (err) {
      setError("Failed to load projects")
    } finally {
      setLoading(false)
    }
  }, [status, filters])

  const createProject = async (projectData: CreateProjectRequest) => {
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(projectData),
      })

      if (response.ok) {
        const data = await response.json()
        setProjects(prev => [data.project, ...prev])
        setError(null)
        return { success: true, project: data.project }
      } else {
        const errorData = await response.json()
        setError(errorData.error || "Failed to create project")
        return { success: false, error: errorData.error }
      }
    } catch (err) {
      const errorMessage = "Failed to create project"
      setError(errorMessage)
      return { success: false, error: errorMessage }
    }
  }

  const updateProject = async (projectId: string, updates: UpdateProjectRequest) => {
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      })

      if (response.ok) {
        const data = await response.json()
        setProjects(prev => prev.map(project => 
          project.id === projectId ? data.project : project
        ))
        setError(null)
        return { success: true, project: data.project }
      } else {
        const errorData = await response.json()
        setError(errorData.error || "Failed to update project")
        return { success: false, error: errorData.error }
      }
    } catch (err) {
      const errorMessage = "Failed to update project"
      setError(errorMessage)
      return { success: false, error: errorMessage }
    }
  }

  const deleteProject = async (projectId: string, options: ProjectDeleteOptions = { taskAction: "unassign" }) => {
    try {
      const searchParams = new URLSearchParams()
      searchParams.append("taskAction", options.taskAction)
      if (options.moveToProjectId) {
        searchParams.append("moveToProjectId", options.moveToProjectId)
      }

      const response = await fetch(`/api/projects/${projectId}?${searchParams.toString()}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setProjects(prev => prev.filter(project => project.id !== projectId))
        setError(null)
        return { success: true }
      } else {
        const errorData = await response.json()
        setError(errorData.error || "Failed to delete project")
        return { success: false, error: errorData.error }
      }
    } catch (err) {
      const errorMessage = "Failed to delete project"
      setError(errorMessage)
      return { success: false, error: errorMessage }
    }
  }

  const completeProject = async (projectId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/complete`, {
        method: "POST",
      })

      if (response.ok) {
        const data = await response.json()
        setProjects(prev => prev.map(project => 
          project.id === projectId ? data.project : project
        ))
        setError(null)
        return { success: true, project: data.project }
      } else {
        const errorData = await response.json()
        setError(errorData.error || "Failed to complete project")
        return { success: false, error: errorData.error }
      }
    } catch (err) {
      const errorMessage = "Failed to complete project"
      setError(errorMessage)
      return { success: false, error: errorMessage }
    }
  }

  const reopenProject = async (projectId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/complete`, {
        method: "DELETE",
      })

      if (response.ok) {
        const data = await response.json()
        setProjects(prev => prev.map(project => 
          project.id === projectId ? data.project : project
        ))
        setError(null)
        return { success: true, project: data.project }
      } else {
        const errorData = await response.json()
        setError(errorData.error || "Failed to reopen project")
        return { success: false, error: errorData.error }
      }
    } catch (err) {
      const errorMessage = "Failed to reopen project"
      setError(errorMessage)
      return { success: false, error: errorMessage }
    }
  }

  const updateFilters = (newFilters: Partial<ProjectFilters>) => {
    const updatedFilters = { ...filters, ...newFilters }
    setFilters(updatedFilters)
    fetchProjects(updatedFilters)
  }

  const clearFilters = () => {
    const clearedFilters = {}
    setFilters(clearedFilters)
    fetchProjects(clearedFilters)
  }

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  return {
    projects,
    loading,
    error,
    filters,
    createProject,
    updateProject,
    deleteProject,
    completeProject,
    reopenProject,
    updateFilters,
    clearFilters,
    refetch: fetchProjects,
  }
}

// Hook for a single project
export function useProject(projectId: string) {
  const { data: session, status } = useSession()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProject = useCallback(async () => {
    if (status !== "authenticated" || !projectId) return

    try {
      setLoading(true)
      const response = await fetch(`/api/projects/${projectId}`)
      
      if (response.ok) {
        const data = await response.json()
        setProject(data.project)
        setError(null)
      } else {
        const errorData = await response.json()
        setError(errorData.error || "Failed to load project")
      }
    } catch (err) {
      setError("Failed to load project")
    } finally {
      setLoading(false)
    }
  }, [status, projectId])

  useEffect(() => {
    fetchProject()
  }, [fetchProject])

  return {
    project,
    loading,
    error,
    refetch: fetchProject,
  }
}