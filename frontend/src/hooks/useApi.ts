import { useState, useEffect, useCallback } from 'react'
import { apiClient, ApiResponse, ApiError } from '@/services/api'

// 通用API Hook选项
interface UseApiOptions<T> {
  immediate?: boolean
  onSuccess?: (data: T) => void
  onError?: (error: ApiError) => void
}

// 通用API Hook返回值
interface UseApiReturn<T> {
  data: T | null
  loading: boolean
  error: ApiError | null
  execute: () => Promise<T>
  reset: () => void
}

// 通用API Hook
export function useApi<T>(
  apiCall: () => Promise<ApiResponse<T>>,
  options: UseApiOptions<T> = {}
): UseApiReturn<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)

  const execute = useCallback(async (): Promise<T> => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await apiCall()
      if (response.success && response.data !== undefined) {
        setData(response.data)
        options.onSuccess?.(response.data)
        return response.data
      } else {
        const apiError = new ApiError(response.message || 'API请求失败')
        setError(apiError)
        options.onError?.(apiError)
        throw apiError
      }
    } catch (err) {
      const apiError = err instanceof ApiError ? err : new ApiError('请求失败')
      setError(apiError)
      options.onError?.(apiError)
      throw apiError
    } finally {
      setLoading(false)
    }
  }, [apiCall, options])

  const reset = useCallback(() => {
    setData(null)
    setLoading(false)
    setError(null)
  }, [])

  useEffect(() => {
    if (options.immediate) {
      execute()
    }
  }, [execute, options.immediate])

  return { data, loading, error, execute, reset }
}

// 分页数据Hook
interface UsePaginatedApiReturn<T> {
  data: T[]
  loading: boolean
  error: ApiError | null
  totalCount: number
  currentPage: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
  nextPage: () => void
  prevPage: () => void
  goToPage: (page: number) => void
  refresh: () => void
}

export function usePaginatedApi<T>(
  apiCall: (page: number, limit: number) => Promise<ApiResponse<any>>,
  initialPage = 1,
  limit = 20
): UsePaginatedApiReturn<T> {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(initialPage)
  const [totalPages, setTotalPages] = useState(0)

  const execute = useCallback(async (page: number) => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await apiCall(page, limit)
      if (response.success && response.data) {
        // 尝试从不同可能的字段名中获取数据
        const dataArray = response.data.data || response.data.projects || []
        setData(dataArray)
        setTotalCount(response.data.total)
        setCurrentPage(response.data.page)
        setTotalPages(response.data.totalPages)
      } else {
        const apiError = new ApiError(response.message || 'API请求失败')
        setError(apiError)
      }
    } catch (err) {
      const apiError = err instanceof ApiError ? err : new ApiError('请求失败')
      setError(apiError)
    } finally {
      setLoading(false)
    }
  }, [apiCall, limit])

  const nextPage = useCallback(() => {
    if (currentPage < totalPages) {
      execute(currentPage + 1)
    }
  }, [currentPage, totalPages, execute])

  const prevPage = useCallback(() => {
    if (currentPage > 1) {
      execute(currentPage - 1)
    }
  }, [currentPage, execute])

  const goToPage = useCallback((page: number) => {
    if (page >= 1 && page <= totalPages) {
      execute(page)
    }
  }, [totalPages, execute])

  const refresh = useCallback(() => {
    execute(currentPage)
  }, [currentPage, execute])

  useEffect(() => {
    execute(initialPage)
  }, [execute, initialPage])

  const hasNextPage = currentPage < totalPages
  const hasPrevPage = currentPage > 1

  return {
    data,
    loading,
    error,
    totalCount,
    currentPage,
    totalPages,
    hasNextPage,
    hasPrevPage,
    nextPage,
    prevPage,
    goToPage,
    refresh,
  }
}