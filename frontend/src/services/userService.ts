import { apiClient, ApiResponse } from './api'
import { User } from './authService'

// 用户更新请求类型
export interface UpdateProfileRequest {
  username?: string
  firstName?: string
  lastName?: string
  avatar?: string
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}

// 用户API服务
export const userService = {
  // 获取用户列表（管理员功能）
  async getUsers(page = 1, limit = 20): Promise<ApiResponse<{ users: User[]; total: number; page: number; totalPages: number }>> {
    return await apiClient.get(`/users?page=${page}&limit=${limit}`)
  },

  // 获取用户详情
  async getUserById(userId: string): Promise<ApiResponse<User>> {
    return await apiClient.get(`/users/${userId}`)
  },

  // 更新用户资料
  async updateProfile(userData: UpdateProfileRequest): Promise<ApiResponse<User>> {
    return await apiClient.put<User>('/users/profile', userData)
  },

  // 上传头像
  async uploadAvatar(file: File): Promise<ApiResponse<{ avatarUrl: string }>> {
    const formData = new FormData()
    formData.append('avatar', file)
    
    return await apiClient.post<{ avatarUrl: string }>('/users/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },

  // 删除用户账户
  async deleteAccount(): Promise<ApiResponse> {
    return await apiClient.delete('/users/account')
  },

  // 获取用户统计信息
  async getUserStats(): Promise<ApiResponse<{
    totalProjects: number
    totalTasks: number
    completedTasks: number
    recentActivity: Array<{
      id: string
      type: string
      description: string
      createdAt: string
    }>
  }>> {
    return await apiClient.get('/users/stats')
  },

  // 更新用户偏好设置
  async updatePreferences(preferences: {
    theme?: 'light' | 'dark' | 'system'
    language?: string
    notifications?: {
      email: boolean
      push: boolean
      projectUpdates: boolean
      taskReminders: boolean
    }
  }): Promise<ApiResponse> {
    return await apiClient.put('/users/preferences', preferences)
  },

  // 获取用户偏好设置
  async getPreferences(): Promise<ApiResponse<{
    theme: 'light' | 'dark' | 'system'
    language: string
    notifications: {
      email: boolean
      push: boolean
      projectUpdates: boolean
      taskReminders: boolean
    }
  }>> {
    return await apiClient.get('/users/preferences')
  },
}