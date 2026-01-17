import React, { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useElectronAPI, useIsElectron } from '../contexts/ElectronAPIContext';
import { useDesktopTheme } from '../contexts/DesktopThemeContext';
import { Sidebar } from './Sidebar';
import { StatusBar } from './StatusBar';
import { NotificationCenter } from './NotificationCenter';

interface DesktopLayoutProps {
  children?: React.ReactNode;
}

export const DesktopLayout: React.FC<DesktopLayoutProps> = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const location = useLocation();
  const navigate = useNavigate();
  const electronAPI = useElectronAPI();
  const isElectron = useIsElectron();
  const { theme, resolvedTheme } = useDesktopTheme();

  // 监听菜单事件
  React.useEffect(() => {
    if (!electronAPI || !isElectron) return;

    const handleMenuToggleSidebar = () => {
      setSidebarCollapsed(prev => !prev);
    };

    const handleMenuToggleTerminal = () => {
      // TODO: 实现终端切换逻辑
      console.log('切换终端面板');
    };

    const handleMenuToggleOutput = () => {
      // TODO: 实现输出面板切换逻辑
      console.log('切换输出面板');
    };

    const handleMenuWelcome = () => {
      navigate('/welcome');
    };

    const handleMenuKeyboardShortcuts = () => {
      // TODO: 显示键盘快捷键对话框
      console.log('显示键盘快捷键');
    };

    // 注册事件监听器
    electronAPI.on('menu-toggle-sidebar', handleMenuToggleSidebar);
    electronAPI.on('menu-toggle-terminal', handleMenuToggleTerminal);
    electronAPI.on('menu-toggle-output', handleMenuToggleOutput);
    electronAPI.on('menu-welcome', handleMenuWelcome);
    electronAPI.on('menu-keyboard-shortcuts', handleMenuKeyboardShortcuts);

    return () => {
      // 清理事件监听器
      if (electronAPI.off) {
        electronAPI.off('menu-toggle-sidebar', handleMenuToggleSidebar);
        electronAPI.off('menu-toggle-terminal', handleMenuToggleTerminal);
        electronAPI.off('menu-toggle-output', handleMenuToggleOutput);
        electronAPI.off('menu-welcome', handleMenuWelcome);
        electronAPI.off('menu-keyboard-shortcuts', handleMenuKeyboardShortcuts);
      }
    };
  }, [electronAPI, isElectron, navigate]);

  const getCurrentPageTitle = () => {
    const path = location.pathname;
    
    if (path.startsWith('/dashboard') || path === '/') {
      return '仪表板';
    } else if (path.startsWith('/project')) {
      return '项目编辑器';
    } else if (path.startsWith('/settings')) {
      return '设置';
    } else if (path.startsWith('/welcome')) {
      return '欢迎';
    } else {
      return 'AI智能体平台';
    }
  };

  return (
    <div className={`desktop-layout h-screen flex flex-col ${resolvedTheme === 'dark' ? 'dark' : 'light'}`}>
      {/* 主内容区域 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 侧边栏 */}
        <div className={`transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-64'}`}>
          <Sidebar 
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
            currentPath={location.pathname}
          />
        </div>

        {/* 主内容 */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* 顶部标题栏 */}
          <header className="glass border-b border-white/10 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-gradient">
                {getCurrentPageTitle()}
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              {/* 主题切换按钮 */}
              <button
                onClick={() => electronAPI.invoke?.('menu-ai-recommend')}
                className="p-2 rounded-lg glass hover:bg-white/10 transition-all duration-200"
                title="AI推荐"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </button>

              <button
                onClick={() => setShowNotificationCenter(!showNotificationCenter)}
                className="p-2 rounded-lg glass hover:bg-white/10 transition-all duration-200 relative"
                title="通知中心"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4 7h16M4 12h16M4 17h7" />
                </svg>
                <span className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              </button>

              <button
                onClick={() => electronAPI.invoke?.('menu-code-analysis')}
                className="p-2 rounded-lg glass hover:bg-white/10 transition-all duration-200"
                title="代码分析"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </button>

              {/* 窗口控制按钮 */}
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => electronAPI.window?.minimize()}
                  className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 transition-all duration-200"
                  title="最小化"
                >
                  <span className="text-sm">─</span>
                </button>
                <button
                  onClick={() => electronAPI.window?.maximize()}
                  className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 transition-all duration-200"
                  title="最大化"
                >
                  <span className="text-sm">□</span>
                </button>
                <button
                  onClick={() => electronAPI.window?.close()}
                  className="w-8 h-8 flex items-center justify-center rounded hover:bg-red-500/20 transition-all duration-200"
                  title="关闭"
                >
                  <span className="text-sm">×</span>
                </button>
              </div>
            </div>
          </header>

          {/* 内容区域 */}
          <main className="flex-1 overflow-auto bg-gradient-to-br from-gray-900/20 to-purple-900/20">
            {children || <Outlet />}
          </main>
        </div>
      </div>

      {/* 状态栏 */}
      <StatusBar />

      {/* 通知中心 */}
      {showNotificationCenter && (
        <NotificationCenter
          messages={messages}
          onClose={() => setShowNotificationCenter(false)}
        />
      )}

      {/* 快捷键提示 */}
      <div className="fixed bottom-4 right-4 text-xs text-gray-500">
        <span className="glass px-2 py-1 rounded">
          按 Ctrl+K 快速搜索 | Ctrl+Shift+A AI助手
        </span>
      </div>
    </div>
  );
};

export default DesktopLayout;