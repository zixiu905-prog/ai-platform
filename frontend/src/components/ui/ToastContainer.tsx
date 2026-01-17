import React from 'react'
import { useToast, Toast } from '@/hooks/useToast'
import { CheckCircle, AlertTriangle, AlertCircle, Info, X } from 'lucide-react'
import { Button } from './button'

const ToastIcon = ({ type }: { type: Toast['type'] }) => {
  const icons = {
    success: <CheckCircle className="h-5 w-5 text-green-500" />,
    error: <AlertCircle className="h-5 w-5 text-red-500" />,
    warning: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
    info: <Info className="h-5 w-5 text-blue-500" />
  }
  return icons[type]
}

const ToastBackground = ({ type }: { type: Toast['type'] }) => {
  const backgrounds = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200',
    warning: 'bg-yellow-50 border-yellow-200',
    info: 'bg-blue-50 border-blue-200'
  }
  return backgrounds[type]
}

const ToastText = ({ type }: { type: Toast['type'] }) => {
  const textColors = {
    success: 'text-green-800',
    error: 'text-red-800',
    warning: 'text-yellow-800',
    info: 'text-blue-800'
  }
  return textColors[type]
}

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast()

  if (toasts.length === 0) {
    return null
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            max-w-sm rounded-lg border p-4 shadow-lg transition-all duration-300
            ${ToastBackground({ type: toast.type })}
          `}
        >
          <div className="flex items-start">
            <ToastIcon type={toast.type} />
            <div className="ml-3 flex-1">
              <p className={`text-sm ${ToastText({ type: toast.type })}`}>
                {toast.message}
              </p>
              {toast.action && (
                <Button
                  variant="link"
                  size="sm"
                  onClick={toast.action.onClick}
                  className={`p-0 h-auto mt-1 ${ToastText({ type: toast.type })}`}
                >
                  {toast.action.label}
                </Button>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => removeToast(toast.id)}
              className="ml-2"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}

export default ToastContainer