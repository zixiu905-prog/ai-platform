import { apiClient, ApiResponse } from './api'

// 项目相关类型定义
export interface Project {
  id: string
  name: string
  description?: string
  status: 'active' | 'completed' | 'archived' | 'on_hold'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  startDate?: string
  endDate?: string
  estimatedHours?: number
  actualHours?: number
  progress: number
  tags: string[]
  owner: {
    id: string
    username: string
    email: string
  }
  members: Array<{
    id: string
    username: string
    role: string
  }>
  createdAt: string
  updatedAt: string
}

export interface CreateProjectRequest {
  name: string
  description?: string
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  startDate?: string
  endDate?: string
  estimatedHours?: number
  tags?: string[]
  memberIds?: string[]
}

export interface UpdateProjectRequest {
  name?: string
  description?: string
  status?: 'active' | 'completed' | 'archived' | 'on_hold'
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  startDate?: string
  endDate?: string
  estimatedHours?: number
  actualHours?: number
  progress?: number
  tags?: string[]
  memberIds?: string[]
}

// 项目API服务
export const projectService = {
  // 获取项目列表
  async getProjects(params?: {
    page?: number
    limit?: number
    status?: string
    priority?: string
    search?: string
  }): Promise<ApiResponse<{
    projects: Project[]
    total: number
    page: number
    totalPages: number
  }>> {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.append('page', params.page.toString())
    if (params?.limit) searchParams.append('limit', params.limit.toString())
    if (params?.status) searchParams.append('status', params.status)
    if (params?.priority) searchParams.append('priority', params.priority)
    if (params?.search) searchParams.append('search', params.search)

    const url = searchParams.toString() ? `/projects?${searchParams.toString()}` : '/projects'
    return await apiClient.get(url)
  },

  // 获取项目详情
  async getProjectById(projectId: string): Promise<ApiResponse<Project>> {
    return await apiClient.get(`/projects/${projectId}`)
  },

  // 创建项目
  async createProject(projectData: CreateProjectRequest): Promise<ApiResponse<Project>> {
    return await apiClient.post<Project>('/projects', projectData)
  },

  // 更新项目
  async updateProject(projectId: string, projectData: UpdateProjectRequest): Promise<ApiResponse<Project>> {
    return await apiClient.put<Project>(`/projects/${projectId}`, projectData)
  },

  // 删除项目
  async deleteProject(projectId: string): Promise<ApiResponse> {
    return await apiClient.delete(`/projects/${projectId}`)
  },

  // 获取项目统计信息
  async getProjectStats(): Promise<ApiResponse<{
    totalProjects: number
    activeProjects: number
    completedProjects: number
    archivedProjects: number
    projectsByPriority: {
      low: number
      medium: number
      high: number
      urgent: number
    }
    totalEstimatedHours: number
    totalActualHours: number
  }>> {
    return await apiClient.get('/projects/stats')
  },

  // 获取我的项目（作为成员或拥有者）
  async getMyProjects(params?: {
    page?: number
    limit?: number
    status?: string
  }): Promise<ApiResponse<{
    projects: Project[]
    total: number
    page: number
    totalPages: number
  }>> {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.append('page', params.page.toString())
    if (params?.limit) searchParams.append('limit', params.limit.toString())
    if (params?.status) searchParams.append('status', params.status)

    const url = searchParams.toString() ? `/projects/my?${searchParams.toString()}` : '/projects/my'
    return await apiClient.get(url)
  },

  // 添加项目成员
  async addProjectMember(projectId: string, userId: string, role: string = 'member'): Promise<ApiResponse> {
    return await apiClient.post(`/projects/${projectId}/members`, {
      userId,
      role,
    })
  },

  // 移除项目成员
  async removeProjectMember(projectId: string, userId: string): Promise<ApiResponse> {
    return await apiClient.delete(`/projects/${projectId}/members/${userId}`)
  },

  // 更新成员角色
  async updateMemberRole(projectId: string, userId: string, role: string): Promise<ApiResponse> {
    return await apiClient.put(`/projects/${projectId}/members/${userId}`, {
      role,
    })
  },
}