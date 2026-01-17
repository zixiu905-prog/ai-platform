import { useState, useCallback, useEffect } from 'react'

export interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

export const useToast = () => {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((
    message: string, 
    type: Toast['type'] = 'info',
    options?: {
      duration?: number
      action?: Toast['action']
    }
  ) => {
    const id = Date.now().toString()
    const toast: Toast = {
      id,
      message,
      type,
      duration: options?.duration || 3000,
      action: options?.action
    }

    setToasts(prev => [...prev, toast])

    if (toast.duration && toast.duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, toast.duration)
    }

    return id
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const showSuccess = useCallback((message: string, options?: { duration?: number; action?: Toast['action'] }) => {
    return showToast(message, 'success', options)
  }, [showToast])

  const showError = useCallback((message: string, options?: { duration?: number; action?: Toast['action'] }) => {
    return showToast(message, 'error', { duration: 5000, ...options })
  }, [showToast])

  const showWarning = useCallback((message: string, options?: { duration?: number; action?: Toast['action'] }) => {
    return showToast(message, 'warning', options)
  }, [showToast])

  const showInfo = useCallback((message: string, options?: { duration?: number; action?: Toast['action'] }) => {
    return showToast(message, 'info', options)
  }, [showToast])

  const clearAll = useCallback(() => {
    setToasts([])
  }, [])

  // 别名方法，为了向后兼容
  const addToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    return showToast(message, type)
  }, [showToast])

  return {
    toasts,
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    removeToast,
    clearAll,
    addToast
  }
}

export default useToast