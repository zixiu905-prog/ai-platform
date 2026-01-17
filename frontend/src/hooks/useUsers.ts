import { useState, useCallback } from 'react'
import { useApi } from './useApi'
import { userService, UpdateProfileRequest } from '@/services/userService'
import { User } from '@/services/authService'

export const useUsers = (immediate = true) => {
  return useApi(
    useCallback(() => 
      userService.getUsers(), 
      []
    ),
    { immediate }
  )
}

export const useUser = (userId: string, immediate = true) => {
  return useApi(
    useCallback(() => 
      userService.getUserById(userId), 
      [userId]
    ),
    { immediate }
  )
}

export const useUpdateProfile = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateProfile = useCallback(async (profileData: UpdateProfileRequest): Promise<User> => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await userService.updateProfile(profileData)
      if (response.success && response.data) {
        return response.data
      } else {
        throw new Error(response.message || '更新资料失败')
      }
    } catch (err: any) {
      setError(err.message || '更新资料失败')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return { updateProfile, loading, error, clearError: () => setError(null) }
}

export const useUploadAvatar = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const uploadAvatar = useCallback(async (file: File): Promise<string> => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await userService.uploadAvatar(file)
      if (response.success && response.data) {
        return response.data.avatarUrl
      } else {
        throw new Error(response.message || '上传头像失败')
      }
    } catch (err: any) {
      setError(err.message || '上传头像失败')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return { uploadAvatar, loading, error, clearError: () => setError(null) }
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

export const useUserPreferences = (immediate = true) => {
  const updatePreferences = useCallback(async (preferences: any) => {
    try {
      const response = await userService.updatePreferences(preferences)
      if (!response.success) {
        throw new Error(response.message || '更新偏好设置失败')
      }
    } catch (err: any) {
      throw new Error(err.message || '更新偏好设置失败')
    }
  }, [])

  return useApi(
    useCallback(() => 
      userService.getPreferences(), 
      []
    ),
    { immediate, onSuccess: updatePreferences }
  )
}