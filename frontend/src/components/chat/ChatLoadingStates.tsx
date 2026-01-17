import React from 'react';
import { Bot, MessageSquare, Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

export function LoadingSpinner({ size = 'md', text }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className="flex items-center justify-center gap-2">
      <div className={`${sizeClasses[size]} animate-spin rounded-full border-2 border-gray-300 border-t-blue-500`}></div>
      {text && <span className="text-sm text-gray-600 dark:text-gray-400">{text}</span>}
    </div>
  );
}

interface ConversationsLoadingProps {
  message?: string;
}

export function ConversationsLoading({ message = "加载对话列表中..." }: ConversationsLoadingProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="space-y-4 w-full max-w-xs">
        {/* 骨架屏 - 模拟对话列表 */}
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                <div className="flex-1 space-y-1">
                  <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <LoadingSpinner size="md" text={message} />
      </div>
    </div>
  );
}

interface MessageLoadingProps {
  message?: string;
}

export function MessageLoading({ message = "AI正在思考中..." }: MessageLoadingProps) {
  return (
    <div className="flex gap-3 p-4 animate-pulse">
      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
        <Bot size={16} className="text-white" />
      </div>
      <div className="flex-1">
        <div className="inline-block p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">{message}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {icon || <MessageSquare size={48} className="text-gray-400 mb-4" />}
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
        {title}
      </h3>
      <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">
        {description}
      </p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

interface StreamingIndicatorProps {
  isVisible: boolean;
  text?: string;
}

export function StreamingIndicator({ isVisible, text = "正在生成回复..." }: StreamingIndicatorProps) {
  if (!isVisible) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 text-blue-700 dark:text-blue-300">
      <Loader2 size={16} className="animate-spin" />
      <span className="text-sm">{text}</span>
    </div>
  );
}

interface ConnectionStatusProps {
  isConnected: boolean;
  isConnecting?: boolean;
}

export function ConnectionStatus({ isConnected, isConnecting = false }: ConnectionStatusProps) {
  if (isConnecting) {
    return (
      <div className="flex items-center gap-2 px-3 py-1 text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 rounded-full">
        <Loader2 size={12} className="animate-spin" />
        连接中...
      </div>
    );
  }

  if (isConnected) {
    return (
      <div className="flex items-center gap-1 px-3 py-1 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-full">
        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
        已连接
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 px-3 py-1 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-full">
      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
      连接断开
    </div>
  );
}