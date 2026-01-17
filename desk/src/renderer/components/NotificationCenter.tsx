import React, { useState, useEffect } from 'react';
import { useElectronAPI } from '../contexts/ElectronAPIContext';

interface Message {
  id: string;
  type: 'system' | 'notification' | 'reminder' | 'update';
  title: string;
  content: string;
  timestamp: string;
  read: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

interface NotificationCenterProps {
  messages: Message[];
  onClose: () => void;
  onMarkRead?: (messageId: string) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ 
  messages, 
  onClose, 
  onMarkRead 
}) => {
  const [filter, setFilter] = useState<'all' | 'unread' | 'system' | 'notification' | 'reminder' | 'update'>('all');
  const electronAPI = useElectronAPI();

  // 标记为已读
  const markAsRead = (id: string) => {
    if (onMarkRead) {
      onMarkRead(id);
    }
  };

  // 标记全部为已读
  const markAllAsRead = () => {
    messages.forEach(message => {
      if (!message.read) {
        onMarkRead?.(message.id);
      }
    });
  };

  // 过滤消息
  const filteredMessages = messages.filter(message => {
    switch (filter) {
      case 'unread':
        return !message.read;
      case 'system':
      case 'notification':
      case 'reminder':
      case 'update':
        return message.type === filter;
      default:
        return true;
    }
  });

  const unreadCount = messages.filter(m => !m.read).length;

  const getMessageIcon = (type: Message['type'], priority: Message['priority']) => {
    // 根据优先级确定颜色
    const getPriorityColor = () => {
      switch (priority) {
        case 'urgent':
          return 'text-red-400';
        case 'high':
          return 'text-orange-400';
        case 'medium':
          return 'text-yellow-400';
        case 'low':
        default:
          return 'text-blue-400';
      }
    };

    const colorClass = getPriorityColor();

    switch (type) {
      case 'notification':
        return (
          <svg className={`w-4 h-4 ${colorClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        );
      case 'reminder':
        return (
          <svg className={`w-4 h-4 ${colorClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'update':
        return (
          <svg className={`w-4 h-4 ${colorClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        );
      case 'system':
      default:
        return (
          <svg className={`w-4 h-4 ${colorClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        );
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}天前`;
    if (hours > 0) return `${hours}小时前`;
    if (minutes > 0) return `${minutes}分钟前`;
    return '刚刚';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end pt-16 pr-4">
      {/* 背景遮罩 */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      ></div>

      {/* 通知中心面板 */}
      <div className="glass-panel w-96 max-h-[600px] flex flex-col relative z-10 animate-in slide-in-from-right duration-300">
        {/* 头部 */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h3 className="text-lg font-semibold text-white">通知中心</h3>
            {unreadCount > 0 && (
              <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                全部已读
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* 过滤器 */}
        <div className="p-3 border-b border-white/10 flex items-center space-x-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="glass text-white text-sm px-3 py-1 rounded border border-white/10 focus:outline-none focus:border-blue-500/50"
          >
            <option value="all">全部</option>
            <option value="unread">未读</option>
            <option value="system">系统</option>
            <option value="notification">通知</option>
            <option value="reminder">提醒</option>
            <option value="update">更新</option>
          </select>
          
          <span className="text-xs text-gray-400">
            {filteredMessages.length} 条消息
          </span>
        </div>

        {/* 消息列表 */}
        <div className="flex-1 overflow-y-auto p-3">
          {filteredMessages.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p>暂无消息</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredMessages.map((message) => (
                <div
                  key={message.id}
                  className={`glass p-3 rounded-lg cursor-pointer transition-all duration-200 hover:bg-white/10 ${
                    !message.read ? 'border-l-2 border-blue-500' : ''
                  }`}
                  onClick={() => markAsRead(message.id)}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getMessageIcon(message.type, message.priority)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-sm font-medium text-white truncate">
                          {message.title}
                        </h4>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-400">
                            {formatTimeAgo(message.timestamp)}
                          </span>
                          {message.priority === 'urgent' && (
                            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-gray-300 line-clamp-2">
                        {message.content}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 底部操作 */}
        <div className="p-3 border-t border-white/10 text-center">
          <p className="text-xs text-gray-400">
            通知会自动保存，重启应用后仍然可见
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotificationCenter;