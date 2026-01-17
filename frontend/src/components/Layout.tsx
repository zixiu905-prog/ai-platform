import React, { useState, useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { 
  Home, 
  Users, 
  Settings, 
  Bot, 
  Workflow, 
  FileCode,
  Menu,
  X,
  LogOut,
  User,
  MessageSquare
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
      if (window.innerWidth < 768) {
        setSidebarOpen(false)
      }
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const menuItems = [
    { icon: Home, label: '首页', path: '/' },
    { icon: MessageSquare, label: 'AI对话', path: '/chat' },
    { icon: Bot, label: 'AI助手', path: '/ai' },
    { icon: Workflow, label: '工作流', path: '/workflows' },
    { icon: FileCode, label: '脚本', path: '/scripts' },
    { icon: Users, label: '用户', path: '/users' },
    { icon: Settings, label: '设置', path: '/settings' },
  ]

  const handleNavigation = (path: string) => {
    if (isMobile) {
      setSidebarOpen(false)
    }
    navigate(path)
  }

  const handleLogout = async () => {
    setIsLoading(true)
    try {
      await logout()
      navigate('/login')
    } catch (error) {
      console.error('登出失败:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex h-screen bg-background">
      {/* 移动端遮罩层 */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 侧边栏 */}
      <div className={`
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        ${isMobile ? 'fixed' : 'relative'}
        z-40 w-64 transition-transform duration-300 ease-in-out bg-card border-r border-border
        lg:translate-x-0
        h-full
      `}>
        <div className="flex flex-col h-full">
          {/* Logo区域 */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold">
                  AI
                </div>
                <span className="text-lg font-semibold text-foreground hidden sm:block">
                  AiDesign
                </span>
              </div>
              
              {/* 移动端关闭按钮 */}
              {isMobile && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSidebarOpen(false)}
                  className="lg:hidden"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* 菜单项 */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {menuItems.map((item) => (
              <Button
                key={item.path}
                variant={location.pathname === item.path ? "secondary" : "ghost"}
                className="w-full justify-start h-12"
                onClick={() => handleNavigation(item.path)}
              >
                <item.icon className="h-5 w-5" />
                <span className="ml-3 hidden sm:block">{item.label}</span>
              </Button>
            ))}
          </nav>

          {/* 桌面端切换按钮 */}
          <div className="p-4 border-t border-border hidden lg:block">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="w-full"
            >
              <Menu className="h-4 w-4" />
            </Button>
          </div>

          {/* 移动端底部操作区 */}
          {isMobile && (
            <div className="p-4 border-t border-border space-y-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => window.location.href = '/settings'}
              >
                <Settings className="h-4 w-4 mr-2" />
                设置
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-64">
        {/* 顶部导航栏 */}
        <header className="h-16 border-b border-border bg-background px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* 移动端菜单按钮 */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden"
            >
              <Menu className="h-6 w-6" />
            </Button>
            
            <h1 className="text-lg sm:text-xl font-semibold text-foreground truncate">
              AiDesign 智能设计平台
            </h1>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* 用户信息 */}
            <div className="flex items-center space-x-2 mr-2">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm">
                {user?.username?.charAt(0).toUpperCase() || 'U'}
              </div>
              <span className="hidden sm:block text-sm font-medium truncate max-w-32">
                {user?.username || '用户'}
              </span>
            </div>
            
            {/* 用户菜单 */}
            <Button variant="ghost" size="icon" onClick={() => handleNavigation('/settings')}>
              <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            
            <Button variant="ghost" size="icon" onClick={handleLogout} disabled={isLoading}>
              <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </div>
        </header>

        {/* 页面内容 - 添加顶部间距避免被导航栏遮挡 */}
        <main className="flex-1 overflow-auto pt-16">
          <div className="p-4 sm:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}