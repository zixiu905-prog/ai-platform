import React, { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { useMobileDetection } from '../../hooks/useMobileDetection';
import { Menu, X, Home, User, Settings, LogOut } from 'lucide-react';

interface MobileLayoutProps {
  children: ReactNode;
  title?: string;
  showHeader?: boolean;
  showBottomNav?: boolean;
}

export const MobileLayout: React.FC<MobileLayoutProps> = ({
  children,
  title = 'AI设计平台',
  showHeader = true,
  showBottomNav = true
}) => {
  const { isMobile, isTablet, screenWidth } = useMobileDetection();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const isMobileLayout = isMobile || (isTablet && screenWidth < 1024);

  // 桌面端使用原Layout
  if (!isMobileLayout) {
    return <>{children}</>;
  }

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* 移动端头部 */}
      {showHeader && (
        <header className="sticky top-0 z-50 bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={toggleSidebar}
                className="p-2 rounded-md hover:bg-gray-100 transition-colors"
                style={{ minWidth: '44px', minHeight: '44px' }}
              >
                {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
              <h1 className="text-lg font-semibold truncate max-w-[200px]">
                {title}
              </h1>
            </div>

            <div className="flex items-center space-x-2">
              <button
                className="p-2 rounded-full bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                style={{ minWidth: '40px', minHeight: '40px' }}
              >
                <User className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>
      )}

      {/* 主内容区域 */}
      <main className={cn(
        'flex-1 overflow-auto',
        {
          'mt-16': showHeader,
          'mb-16': showBottomNav,
          'pt-4': true,
          'pb-4': true,
          'px-4': true
        }
      )}>
        <div className="max-w-lg mx-auto">
          {children}
        </div>
      </main>

      {/* 移动端底部导航 */}
      {showBottomNav && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
          <div className="grid grid-cols-5 py-2">
            <a href="/dashboard" className="flex flex-col items-center py-2 text-blue-600">
              <Home className="h-5 w-5 mb-1" />
              <span className="text-xs">首页</span>
            </a>

            <a href="/chat" className="flex flex-col items-center py-2 text-gray-600 hover:text-green-600 transition-colors">
              <Menu className="h-5 w-5 mb-1" />
              <span className="text-xs">对话</span>
            </a>

            <a href="/ai" className="flex flex-col items-center py-2 text-gray-600 hover:text-purple-600 transition-colors">
              <div className="h-5 w-5 mb-1 bg-purple-500 rounded" />
              <span className="text-xs">AI工具</span>
            </a>

            <a href="/workflow" className="flex flex-col items-center py-2 text-gray-600 hover:text-indigo-600 transition-colors">
              <div className="h-5 w-5 mb-1 bg-indigo-500 rounded" />
              <span className="text-xs">工作流</span>
            </a>

            <a href="/profile" className="flex flex-col items-center py-2 text-gray-600 hover:text-blue-600 transition-colors">
              <User className="h-5 w-5 mb-1" />
              <span className="text-xs">我的</span>
            </a>
          </div>
        </nav>
      )}
    </div>
  );
};
