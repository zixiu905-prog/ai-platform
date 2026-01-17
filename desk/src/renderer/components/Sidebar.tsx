import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useElectronAPI } from '../contexts/ElectronAPIContext';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  currentPath: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggleCollapse, currentPath }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const electronAPI = useElectronAPI();

  const menuItems = [
    {
      id: 'dashboard',
      label: '仪表板',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
      path: '/dashboard'
    },
    {
      id: 'projects',
      label: '项目管理',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
      path: '/projects'
    },
    {
      id: 'ai-assistant',
      label: 'AI助手',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-4l-4 4z" />
        </svg>
      ),
      path: '/ai-assistant'
    },
    {
      id: 'code-analysis',
      label: '代码分析',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      path: '/code-analysis'
    },
    {
      id: 'workflows',
      label: '工作流',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
      path: '/workflows'
    },
    {
      id: 'scripts',
      label: '脚本管理',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      ),
      path: '/scripts'
    },
  ];

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const handleAIAssistant = () => {
    // 打开AI助手窗口
    if (electronAPI && electronAPI.window) {
      electronAPI.invoke('menu-customer-service');
    }
  };

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return currentPath === '/' || currentPath.startsWith('/dashboard');
    }
    return currentPath.startsWith(path);
  };

  return (
    <div className={`sidebar transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'}`}>
      {/* 侧边栏头部 */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-white font-semibold">AI Platform</span>
            </div>
          )}
          
          <button
            onClick={onToggleCollapse}
            className={`p-2 rounded-lg hover:bg-white/10 transition-all duration-200 ${collapsed ? 'mx-auto' : ''}`}
            title={collapsed ? "展开侧边栏" : "收起侧边栏"}
          >
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {collapsed ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* 菜单项 */}
      <nav className="flex-1 p-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => item.id === 'ai-assistant' ? handleAIAssistant() : handleNavigation(item.path)}
            className={`sidebar-item w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-200 mb-1 ${
              isActive(item.path)
                ? 'bg-gradient-to-r from-blue-500/20 to-purple-600/20 text-white border-l-4 border-blue-500'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
            title={collapsed ? item.label : ''}
          >
            <span className="flex-shrink-0">{item.icon}</span>
            {!collapsed && (
              <span className="text-sm font-medium">{item.label}</span>
            )}
          </button>
        ))}

        {/* 分隔线 */}
        {!collapsed && (
          <div className="border-t border-white/10 my-4"></div>
        )}

        {/* 工具菜单 */}
        <div className="mt-auto pt-4">
          <button
            onClick={() => electronAPI?.invoke('menu-settings')}
            className={`sidebar-item w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-200 ${
              currentPath.startsWith('/settings')
                ? 'bg-gradient-to-r from-blue-500/20 to-purple-600/20 text-white border-l-4 border-blue-500'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
            title={collapsed ? "设置" : ""}
          >
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {!collapsed && (
              <span className="text-sm font-medium">设置</span>
            )}
          </button>
        </div>
      </nav>

      {/* 底部信息 */}
      {!collapsed && (
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-gray-400">系统就绪</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;