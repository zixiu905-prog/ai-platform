import React from 'react'
import LoadingSpinner from './LoadingSpinner'

interface LoadingPageProps {
  message?: string
  fullScreen?: boolean
}

export const LoadingPage: React.FC<LoadingPageProps> = ({ 
  message = '加载中...', 
  fullScreen = true 
}) => {
  const containerClasses = fullScreen 
    ? 'min-h-screen flex items-center justify-center'
    : 'flex items-center justify-center p-8'

  return (
    <div className={containerClasses}>
      <div className="text-center space-y-4">
        <LoadingSpinner size="lg" className="mx-auto" />
        <p className="text-muted-foreground">{message}</p>
      </div>
    </div>
  )
}

export default LoadingPage