import React from 'react'
import { Button, ButtonProps } from './button'
import LoadingSpinner from './LoadingSpinner'
import { cn } from '@/lib/utils'

interface LoadingButtonProps extends ButtonProps {
  loading?: boolean
  loadingText?: string
  children: React.ReactNode
}

export const LoadingButton: React.FC<LoadingButtonProps> = ({
  loading = false,
  loadingText = '加载中...',
  disabled,
  children,
  className,
  ...props
}) => {
  return (
    <Button
      disabled={disabled || loading}
      className={cn('relative', className)}
      {...props}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <LoadingSpinner size="sm" className="text-current" />
        </div>
      )}
      <span className={cn(loading ? 'opacity-0' : '')}>
        {children}
      </span>
      {loading && (
        <span className="absolute left-1/2 transform -translate-x-1/2">
          {loadingText}
        </span>
      )}
    </Button>
  )
}

export default LoadingButton