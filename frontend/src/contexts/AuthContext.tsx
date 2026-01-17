import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react'
import { authService, User, LoginRequest, RegisterRequest, LoginResponse, saveUserData, clearUserData, getUserData } from '@/services/authService'

// 认证状态类型
export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

// 认证操作类型
export type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: { user: User; token: string } }
  | { type: 'AUTH_FAILURE'; payload: string | null }
  | { type: 'LOGOUT' }
  | { type: 'CLEAR_ERROR' }
  | { type: 'UPDATE_USER'; payload: User }

// 初始状态
const initialState: AuthState = {
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: false,
  isLoading: true,
  error: null,
}

// 认证reducer
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'AUTH_START':
      return {
        ...state,
        isLoading: true,
        error: null,
      }
    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      }
    case 'AUTH_FAILURE':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload,
      }
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      }
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      }
    case 'UPDATE_USER':
      return {
        ...state,
        user: action.payload,
      }
    default:
      return state
  }
}

// 认证上下文类型
export interface AuthContextType extends AuthState {
  login: (credentials: LoginRequest) => Promise<void>
  register: (userData: RegisterRequest) => Promise<void>
  logout: () => Promise<void>
  refreshToken: () => Promise<void>
  clearError: () => void
  updateUser: (user: User) => void
}

// 创建认证上下文
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// 认证Provider组件
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState)

  // 登录函数
  const login = async (credentials: LoginRequest) => {
    try {
      dispatch({ type: 'AUTH_START' })
      const response = await authService.login(credentials)
      
      if (response.success && response.data) {
        const { user, token } = response.data
        saveUserData({ user, token, refreshToken: '' }) // refreshToken暂时为空字符串
        dispatch({ type: 'AUTH_SUCCESS', payload: { user, token } })
      } else {
        throw new Error(response.message || '登录失败')
      }
    } catch (error: any) {
      const errorMessage = error.message || '登录失败'
      dispatch({ type: 'AUTH_FAILURE', payload: errorMessage })
      throw error
    }
  }

  // 注册函数
  const register = async (userData: RegisterRequest) => {
    try {
      dispatch({ type: 'AUTH_START' })
      const response = await authService.register(userData)
      
      if (response.success && response.data) {
        const { user, token } = response.data
        saveUserData({ user, token, refreshToken: '' })
        dispatch({ type: 'AUTH_SUCCESS', payload: { user, token } })
      } else {
        throw new Error(response.message || '注册失败')
      }
    } catch (error: any) {
      const errorMessage = error.message || '注册失败'
      dispatch({ type: 'AUTH_FAILURE', payload: errorMessage })
      throw error
    }
  }

  // 登出函数
  const logout = async () => {
    try {
      await authService.logout()
    } catch (error) {
      // 即使登出API失败，也要清除本地数据
      console.error('Logout API error:', error)
    } finally {
      clearUserData()
      dispatch({ type: 'LOGOUT' })
    }
  }

  // 刷新token函数
  const refreshToken = async () => {
    try {
      const refreshTokenValue = localStorage.getItem('refreshToken')
      if (!refreshTokenValue) {
        throw new Error('No refresh token available')
      }

      const response = await authService.refreshToken(refreshTokenValue)
      
      if (response.success && response.data) {
        const { token } = response.data
        localStorage.setItem('token', token)
        // 不需要更新用户信息，只更新token
        dispatch({ type: 'AUTH_SUCCESS', payload: { user: state.user!, token } })
      } else {
        throw new Error(response.message || 'Token刷新失败')
      }
    } catch (error) {
      // Token刷新失败，清除认证状态
      clearUserData()
      dispatch({ type: 'LOGOUT' })
      throw error
    }
  }

  // 清除错误
  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' })
  }

  // 更新用户信息
  const updateUser = (user: User) => {
    localStorage.setItem('user', JSON.stringify(user))
    dispatch({ type: 'UPDATE_USER', payload: user })
  }

  // 初始化认证状态
  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('token')
      const userData = getUserData()

      if (token && userData) {
        try {
          // 验证token是否仍然有效
          const response = await authService.getCurrentUser()
          if (response.success && response.data) {
            dispatch({ type: 'AUTH_SUCCESS', payload: { user: response.data, token } })
          } else {
            // Token无效，清除本地数据
            clearUserData()
            dispatch({ type: 'AUTH_FAILURE', payload: 'Token已过期' })
          }
        } catch (error) {
          // Token验证失败，清除本地数据
          clearUserData()
          dispatch({ type: 'AUTH_FAILURE', payload: 'Token验证失败' })
        }
      } else {
        // 没有token或用户数据，设置为未认证状态
        dispatch({ type: 'AUTH_FAILURE', payload: null })
      }
    }

    initializeAuth()
  }, [])

  const value: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    refreshToken,
    clearError,
    updateUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// 使用认证上下文的Hook
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// 导出用于组件的高阶组件
export const withAuth = <P extends object>(Component: React.ComponentType<P>) => {
  return (props: P) => {
    const auth = useAuth()
    return <Component {...props} auth={auth} />
  }
}