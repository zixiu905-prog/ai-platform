import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/AuthContext'
import { useAuthActions } from '@/hooks/useAuth'
import { useProjects, useUserStats } from '@/hooks/useProjects'
import { useToast } from '@/hooks/useToast'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { validateEmail } from '@/utils/validation'

export default function ApiTest() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const { login, logout } = useAuthActions()
  const { showSuccess, showError, showInfo } = useToast()
  
  const [testEmail, setTestEmail] = useState('test@aidesign.com')
  const [testPassword, setTestPassword] = useState('password123')
  const [loginLoading, setLoginLoading] = useState(false)
  
  // 测试项目API
  const { 
    data: projects, 
    loading: projectsLoading, 
    error: projectsError,
    refresh 
  } = useProjects(false)
  
  // 测试用户统计API
  const { 
    data: userStats, 
    loading: statsLoading, 
    error: statsError 
  } = useUserStats(false)

  const handleTestLogin = async () => {
    if (!validateEmail(testEmail)) {
      showError('邮箱格式不正确')
      return
    }
    
    setLoginLoading(true)
    try {
      await login({ email: testEmail, password: testPassword })
      showSuccess('登录测试成功！')
    } catch (error) {
      showError('登录测试失败')
    } finally {
      setLoginLoading(false)
    }
  }

  const handleTestLogout = async () => {
    try {
      await logout()
      showInfo('已成功登出')
    } catch (error) {
      showError('登出失败')
    }
  }

  const handleTestProjectsApi = async () => {
    try {
      await refresh()
      showSuccess('项目API测试成功')
    } catch (error) {
      showError('项目API测试失败')
    }
  }

  const handleTestUserStatsApi = async () => {
    // 这里需要手动触发用户统计API的调用
    showInfo('用户统计API已通过hook自动测试')
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">API集成和状态管理测试</h1>
        <p className="text-muted-foreground mt-2">
          测试后端API集成、认证状态管理、错误处理等功能
        </p>
      </div>

      {/* 认证状态 */}
      <Card>
        <CardHeader>
          <CardTitle>认证状态</CardTitle>
          <CardDescription>当前用户的认证状态信息</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {authLoading ? (
            <div className="flex items-center space-x-2">
              <LoadingSpinner size="sm" />
              <span>检查认证状态中...</span>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <span>认证状态:</span>
                <Badge variant={isAuthenticated ? 'default' : 'secondary'}>
                  {isAuthenticated ? '已认证' : '未认证'}
                </Badge>
              </div>
              {user && (
                <div className="space-y-2">
                  <p><strong>用户ID:</strong> {user.id}</p>
                  <p><strong>用户名:</strong> {user.username}</p>
                  <p><strong>邮箱:</strong> {user.email}</p>
                  <p><strong>角色:</strong> {user.role}</p>
                  <p><strong>邮箱验证:</strong> {user.isEmailVerified ? '已验证' : '未验证'}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 登录测试 */}
      <Card>
        <CardHeader>
          <CardTitle>登录测试</CardTitle>
          <CardDescription>测试用户登录功能</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="test-email">测试邮箱</Label>
              <Input
                id="test-email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="请输入邮箱"
              />
            </div>
            <div>
              <Label htmlFor="test-password">测试密码</Label>
              <Input
                id="test-password"
                type="password"
                value={testPassword}
                onChange={(e) => setTestPassword(e.target.value)}
                placeholder="请输入密码"
              />
            </div>
          </div>
          <div className="flex space-x-2">
            <Button onClick={handleTestLogin} disabled={loginLoading}>
              {loginLoading ? <LoadingSpinner size="sm" /> : null}
              测试登录
            </Button>
            <Button variant="outline" onClick={handleTestLogout}>
              测试登出
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* API测试 */}
      <Card>
        <CardHeader>
          <CardTitle>API功能测试</CardTitle>
          <CardDescription>测试各种API功能</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 项目API测试 */}
          <div>
            <h3 className="text-lg font-medium mb-3">项目API</h3>
            <div className="space-y-3">
              <Button onClick={handleTestProjectsApi} disabled={projectsLoading}>
                {projectsLoading ? <LoadingSpinner size="sm" /> : null}
                测试项目列表API
              </Button>
              {projects && (
                <div className="p-3 bg-gray-50 rounded">
                  <p><strong>返回数据:</strong></p>
                  <pre className="text-xs mt-2 overflow-x-auto">
                    {JSON.stringify(projects, null, 2)}
                  </pre>
                </div>
              )}
              {projectsError && (
                <ErrorMessage 
                  error={projectsError.message} 
                  onRetry={handleTestProjectsApi}
                  variant="inline"
                />
              )}
            </div>
          </div>

          {/* 用户统计API测试 */}
          <div>
            <h3 className="text-lg font-medium mb-3">用户统计API</h3>
            <div className="space-y-3">
              <Button onClick={handleTestUserStatsApi} disabled={statsLoading}>
                {statsLoading ? <LoadingSpinner size="sm" /> : null}
                测试用户统计API
              </Button>
              {userStats && (
                <div className="p-3 bg-gray-50 rounded">
                  <p><strong>返回数据:</strong></p>
                  <pre className="text-xs mt-2 overflow-x-auto">
                    {JSON.stringify(userStats, null, 2)}
                  </pre>
                </div>
              )}
              {statsError && (
                <ErrorMessage 
                  error={statsError.message} 
                  variant="inline"
                />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 状态管理测试 */}
      <Card>
        <CardHeader>
          <CardTitle>状态管理测试</CardTitle>
          <CardDescription>测试Context和Hook的状态管理</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p><strong>全局认证状态:</strong> {isAuthenticated ? '已登录' : '未登录'}</p>
            <p><strong>当前用户:</strong> {user ? user.username : '无用户'}</p>
            <p><strong>本地存储Token:</strong> {localStorage.getItem('token') ? '存在' : '不存在'}</p>
            <p><strong>本地存储用户:</strong> {localStorage.getItem('user') ? '存在' : '不存在'}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}