import { useState, useCallback } from 'react'
import { useApi, usePaginatedApi } from './useApi'
import { projectService, Project, CreateProjectRequest, UpdateProjectRequest } from '@/services/projectService'
import { userService } from '@/services/userService'

export const useProjects = (immediate = true) => {
  return usePaginatedApi(
    useCallback((page, limit) => 
      projectService.getProjects({ page, limit }), 
      []
    ),
    1,
    10
  )
}

export const useProject = (projectId: string, immediate = true) => {
  return useApi(
    useCallback(() => 
      projectService.getProjectById(projectId), 
      [projectId]
    ),
    { immediate }
  )
}

export const useCreateProject = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createProject = useCallback(async (projectData: CreateProjectRequest): Promise<Project> => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await projectService.createProject(projectData)
      if (response.success && response.data) {
        return response.data
      } else {
        throw new Error(response.message || '创建项目失败')
      }
    } catch (err: any) {
      setError(err.message || '创建项目失败')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return { createProject, loading, error, clearError: () => setError(null) }
}

export const useUpdateProject = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateProject = useCallback(async (
    projectId: string, 
    projectData: UpdateProjectRequest
  ): Promise<Project> => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await projectService.updateProject(projectId, projectData)
      if (response.success && response.data) {
        return response.data
      } else {
        throw new Error(response.message || '更新项目失败')
      }
    } catch (err: any) {
      setError(err.message || '更新项目失败')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return { updateProject, loading, error, clearError: () => setError(null) }
}

export const useDeleteProject = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const deleteProject = useCallback(async (projectId: string): Promise<void> => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await projectService.deleteProject(projectId)
      if (!response.success) {
        throw new Error(response.message || '删除项目失败')
      }
    } catch (err: any) {
      setError(err.message || '删除项目失败')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return { deleteProject, loading, error, clearError: () => setError(null) }
}

export const useMyProjects = (immediate = true) => {
  return usePaginatedApi(
    useCallback((page, limit) => 
      projectService.getMyProjects({ page, limit }), 
      []
    ),
    1,
    10
  )
}

export const useProjectStats = (immediate = true) => {
  return useApi(
    useCallback(() => 
      projectService.getProjectStats(), 
      []
    ),
    { immediate }
  )
}

export const useUserStats = (immediate = true) => {
  return useApi(
    useCallback(() => 
      userService.getUserStats(), 
      []
    ),
    { immediate }
  )
}