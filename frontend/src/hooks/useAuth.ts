import { useState, useCallback } from 'react'
import { useAuth as useContextAuth } from '@/contexts/AuthContext'
import { LoginRequest, RegisterRequest } from '@/services/authService'

// 重新导出 useAuth
export const useAuth = useContextAuth

export const useAuthActions = () => {
  const { login, register, logout, isLoading, error, clearError } = useAuth()
  const [localLoading, setLocalLoading] = useState(false)

  const handleLogin = useCallback(async (credentials: LoginRequest) => {
    setLocalLoading(true)
    clearError()
    try {
      await login(credentials)
    } finally {
      setLocalLoading(false)
    }
  }, [login, clearError])

  const handleRegister = useCallback(async (userData: RegisterRequest) => {
    setLocalLoading(true)
    clearError()
    try {
      await register(userData)
    } finally {
      setLocalLoading(false)
    }
  }, [register, clearError])

  const handleLogout = useCallback(async () => {
    setLocalLoading(true)
    try {
      await logout()
    } finally {
      setLocalLoading(false)
    }
  }, [logout])

  return {
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
    isLoading: isLoading || localLoading,
    error,
    clearError,
  }
}