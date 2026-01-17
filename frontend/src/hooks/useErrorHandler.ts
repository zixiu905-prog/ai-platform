import { useCallback } from 'react'
import { useToast } from './useToast'
import { ApiError } from '@/services/api'

export const useErrorHandler = () => {
  const { showError } = useToast()

  const handleError = useCallback((error: unknown, defaultMessage = '操作失败') => {
    console.error('Error occurred:', error)
    
    let message = defaultMessage
    
    if (error instanceof ApiError) {
      message = error.message
    } else if (error instanceof Error) {
      message = error.message
    } else if (typeof error === 'string') {
      message = error
    }
    
    showError(message)
    
    return message
  }, [showError])

  const handleAsyncError = useCallback(
    async <T>(asyncFn: () => Promise<T>, defaultMessage?: string): Promise<T | null> => {
      try {
        return await asyncFn()
      } catch (error) {
        handleError(error, defaultMessage)
        return null
      }
    },
    [handleError]
  )

  return {
    handleError,
    handleAsyncError
  }
}

export default useErrorHandler