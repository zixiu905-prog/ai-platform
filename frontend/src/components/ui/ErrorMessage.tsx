import React from 'react'
import { AlertTriangle, X, RefreshCw } from 'lucide-react'
import { Button } from './button'
import { cn } from '@/lib/utils'

interface ErrorMessageProps {
  error: string | Error
  onRetry?: () => void
  onDismiss?: () => void
  variant?: 'default' | 'inline' | 'toast'
  className?: string
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  error,
  onRetry,
  onDismiss,
  variant = 'default',
  className
}) => {
  const errorMessage = error instanceof Error ? error.message : error

  if (variant === 'toast') {
    return (
      <div className={cn(
        "fixed top-4 right-4 z-50 max-w-sm bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg",
        className
      )}>
        <div className="flex items-start">
          <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="ml-3 flex-1">
            <p className="text-sm text-red-800">{errorMessage}</p>
            {onRetry && (
              <Button
                variant="link"
                size="sm"
                onClick={onRetry}
                className="p-0 h-auto text-red-700 hover:text-red-900"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                重试
              </Button>
            )}
          </div>
          {onDismiss && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onDismiss}
              className="ml-2 text-red-500 hover:text-red-700"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    )
  }

  if (variant === 'inline') {
    return (
      <div className={cn(
        "flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-md",
        className
      )}>
        <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
        <span className="text-sm text-red-700">{errorMessage}</span>
        {onRetry && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRetry}
            className="ml-auto text-red-700 hover:text-red-900"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            重试
          </Button>
        )}
        {onDismiss && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onDismiss}
            className="text-red-500 hover:text-red-700"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className={cn(
      "text-center p-8 bg-red-50 border border-red-200 rounded-lg",
      className
    )}>
      <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-red-800 mb-2">出现错误</h3>
      <p className="text-red-600 mb-6">{errorMessage}</p>
      
      <div className="flex justify-center space-x-3">
        {onRetry && (
          <Button onClick={onRetry} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            重试
          </Button>
        )}
        {onDismiss && (
          <Button onClick={onDismiss} variant="outline">
            <X className="h-4 w-4 mr-2" />
            关闭
          </Button>
        )}
      </div>
    </div>
  )
}

export default ErrorMessage