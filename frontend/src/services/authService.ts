import { apiClient, ApiResponse } from './api'

// 用户相关类型定义
export interface User {
  id: string
  username: string
  email: string
  firstName?: string
  lastName?: string
  avatar?: string
  role: string
  isEmailVerified: boolean
  createdAt: string
  updatedAt: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  username: string
  email: string
  password: string
  firstName?: string
  lastName?: string
}

export interface LoginResponse {
  user: User
  token: string
  refreshToken: string
}

export interface ResetPasswordRequest {
  email: string
}

export interface ConfirmResetPasswordRequest {
  token: string
  newPassword: string
}

// 认证API服务
export const authService = {
  // 用户登录
  async login(credentials: LoginRequest): Promise<ApiResponse<LoginResponse>> {
    return await apiClient.post<LoginResponse>('/auth/login', credentials)
  },

  // 用户注册
  async register(userData: RegisterRequest): Promise<ApiResponse<LoginResponse>> {
    return await apiClient.post<LoginResponse>('/auth/register', userData)
  },

  // 用户登出
  async logout(): Promise<ApiResponse> {
    const response = await apiClient.post('/auth/logout')
    // 清除本地存储
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    return response
  },

  // 刷新token
  async refreshToken(refreshToken: string): Promise<ApiResponse<{ token: string }>> {
    return await apiClient.post<{ token: string }>('/auth/refresh', {
      refreshToken,
    })
  },

  // 获取当前用户信息
  async getCurrentUser(): Promise<ApiResponse<User>> {
    return await apiClient.get<User>('/auth/me')
  },

  // 邮箱验证
  async verifyEmail(token: string): Promise<ApiResponse> {
    return await apiClient.post('/auth/verify-email', { token })
  },

  // 重新发送验证邮件
  async resendVerificationEmail(): Promise<ApiResponse> {
    return await apiClient.post('/auth/resend-verification')
  },

  // 请求密码重置
  async requestPasswordReset(email: string): Promise<ApiResponse> {
    return await apiClient.post('/auth/forgot-password', { email })
  },

  // 确认密码重置
  async confirmResetPassword(data: ConfirmResetPasswordRequest): Promise<ApiResponse> {
    return await apiClient.post('/auth/reset-password', data)
  },

  // 修改密码
  async changePassword(oldPassword: string, newPassword: string): Promise<ApiResponse> {
    return await apiClient.post('/auth/change-password', {
      oldPassword,
      newPassword,
    })
  },
}

// 辅助函数：保存用户数据到本地存储
export const saveUserData = (userData: LoginResponse) => {
  localStorage.setItem('token', userData.token)
  localStorage.setItem('refreshToken', userData.refreshToken)
  localStorage.setItem('user', JSON.stringify(userData.user))
}

// 辅助函数：从本地存储获取用户数据
export const getUserData = (): User | null => {
  const userData = localStorage.getItem('user')
  return userData ? JSON.parse(userData) : null
}

// 辅助函数：清除用户数据
export const clearUserData = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('refreshToken')
  localStorage.removeItem('user')
}