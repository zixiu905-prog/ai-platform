import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  Download,
  FileText,
  Activity,
  Settings
} from 'lucide-react'
import axios from 'axios'

interface SoftwareApiStats {
  userSoftware: Array<{ status: string; _count: { id: number } }>
  totalSupportedSoftware: number
  latestApiSpecs: number
  fixFilesCount: number
  lastUpdate: string
}

interface SoftwareHealth {
  softwareId: string
  status: 'healthy' | 'unhealthy' | 'not_connected' | 'error'
  version?: string
  message: string
}

interface SoftwareApi {
  id: string
  softwareId: string
  version: string
  apiVersion: string
  status?: string
}

export const SoftwareApiDashboard: React.FC = () => {
  const [stats, setStats] = useState<SoftwareApiStats | null>(null)
  const [healthChecks, setHealthChecks] = useState<SoftwareHealth[]>([])
  const [recentApiSpecs, setRecentApiSpecs] = useState<SoftwareApi[]>([])
  const [loading, setLoading] = useState(false)

  // 获取统计信息
  const fetchStats = async () => {
    try {
      const response = await axios.get('/api/software-api-management/stats')
      if (response.data.success) {
        setStats(response.data.data)
      }
    } catch (error) {
      console.error('获取统计信息失败:', error)
    }
  }

  // 获取健康检查结果
  const fetchHealthChecks = async () => {
    try {
      // 这里应该获取用户连接的软件列表，然后进行健康检查
      // 为了演示，我们使用模拟数据
      const mockHealthChecks: SoftwareHealth[] = [
        {
          softwareId: 'photoshop',
          status: 'healthy',
          version: '2024.1.0',
          message: '运行正常'
        },
        {
          softwareId: 'autocad',
          status: 'unhealthy',
          version: '2023.3.0',
          message: '需要更新API版本'
        },
        {
          softwareId: 'blender',
          status: 'not_connected',
          message: '未连接'
        }
      ]
      setHealthChecks(mockHealthChecks)
    } catch (error) {
      console.error('获取健康检查失败:', error)
    }
  }

  // 获取最近的API规范
  const fetchRecentApiSpecs = async () => {
    try {
      const response = await axios.get('/api/software/list')
      if (response.data.success) {
        const userSoftwares = response.data.data
        // 模拟最近API规范数据
        const mockApiSpecs: SoftwareApi[] = userSoftwares.slice(0, 3).map((software: any) => ({
          id: software.id,
          softwareId: software.softwareId,
          version: software.version || 'unknown',
          apiVersion: software.apiVersion || '1.0',
          status: software.status
        }))
        setRecentApiSpecs(mockApiSpecs)
      }
    } catch (error) {
      console.error('获取API规范失败:', error)
    }
  }

  // 执行健康检查
  const performHealthCheck = async (softwareId: string) => {
    try {
      setLoading(true)
      const response = await axios.get(`/api/software-api-management/health/${softwareId}`)
      if (response.data.success) {
        const healthData = response.data.data
        setHealthChecks(prev => 
          prev.map(health => 
            health.softwareId === softwareId ? healthData : health
          )
        )
      }
    } catch (error) {
      console.error('健康检查失败:', error)
    } finally {
      setLoading(false)
    }
  }

  // 批量健康检查
  const performAllHealthChecks = async () => {
    setLoading(true)
    try {
      // 这里应该并行执行所有软件的健康检查
      await Promise.all(healthChecks.map(health => 
        health.status !== 'not_connected' && performHealthCheck(health.softwareId)
      ))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
    fetchHealthChecks()
    fetchRecentApiSpecs()
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'unhealthy':
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'not_connected':
      case 'disconnected':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      default:
        return <Activity className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'connected':
        return <Badge className="bg-green-500">健康</Badge>
      case 'unhealthy':
      case 'error':
        return <Badge variant="destructive">异常</Badge>
      case 'not_connected':
      case 'disconnected':
        return <Badge variant="secondary">未连接</Badge>
      default:
        return <Badge variant="outline">未知</Badge>
    }
  }

  const calculateHealthPercentage = () => {
    if (!healthChecks.length) return 0
    const healthyCount = healthChecks.filter(h => h.status === 'healthy').length
    return Math.round((healthyCount / healthChecks.length) * 100)
  }

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">已连接软件</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.userSoftware.find(s => s.status === 'connected')?._count.id || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              总共 {stats?.totalSupportedSoftware || 0} 个支持
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API规范</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.latestApiSpecs || 0}</div>
            <p className="text-xs text-muted-foreground">最新版本</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">修复文件</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.fixFilesCount || 0}</div>
            <p className="text-xs text-muted-foreground">可用修复</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">健康状态</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{calculateHealthPercentage()}%</div>
            <Progress value={calculateHealthPercentage()} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* 健康检查 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>软件健康检查</CardTitle>
              <CardDescription>监控已连接软件的状态和API兼容性</CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={performAllHealthChecks}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              刷新检查
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {healthChecks.map(health => (
              <div key={health.softwareId} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(health.status)}
                  <div>
                    <div className="font-medium capitalize">{health.softwareId}</div>
                    {health.version && (
                      <div className="text-sm text-muted-foreground">v{health.version}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {getStatusBadge(health.status)}
                  {health.status !== 'not_connected' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => performHealthCheck(health.softwareId)}
                      disabled={loading}
                    >
                      <RefreshCw className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 最近API规范 */}
      <Card>
        <CardHeader>
          <CardTitle>最近API规范</CardTitle>
          <CardDescription>最新更新的软件API规范文档</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentApiSpecs.map(api => (
              <div key={api.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium capitalize">{api.softwareId}</div>
                  <div className="text-sm text-muted-foreground">
                    版本 {api.version} • API {api.apiVersion}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {api.status && getStatusBadge(api.status)}
                  <Button variant="outline" size="sm">
                    查看文档
                  </Button>
                </div>
              </div>
            ))}
          </div>
          {recentApiSpecs.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4" />
              <p>暂无API规范</p>
              <p className="text-sm">连接软件后将显示相关API规范</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 快速操作 */}
      <Card>
        <CardHeader>
          <CardTitle>快速操作</CardTitle>
          <CardDescription>常用的软件API管理操作</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              variant="outline" 
              className="h-auto p-4 flex flex-col items-start"
              onClick={() => window.location.href = '/software-api-management'}
            >
              <Settings className="h-6 w-6 mb-2" />
              <div className="text-left">
                <div className="font-medium">软件管理</div>
                <div className="text-sm text-muted-foreground">管理所有软件和API</div>
              </div>
            </Button>

            <Button 
              variant="outline" 
              className="h-auto p-4 flex flex-col items-start"
              onClick={() => window.location.href = '/software-api-management?tab=version-detection'}
            >
              <RefreshCw className="h-6 w-6 mb-2" />
              <div className="text-left">
                <div className="font-medium">版本检测</div>
                <div className="text-sm text-muted-foreground">检查软件版本更新</div>
              </div>
            </Button>

            <Button 
              variant="outline" 
              className="h-auto p-4 flex flex-col items-start"
              onClick={() => window.location.href = '/software-api-management?tab=fix-files'}
            >
              <Download className="h-6 w-6 mb-2" />
              <div className="text-left">
                <div className="font-medium">修复文件</div>
                <div className="text-sm text-muted-foreground">下载修复和增强文件</div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 警告和通知 */}
      {healthChecks.some(h => h.status === 'unhealthy' || h.status === 'error') && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            检测到 {healthChecks.filter(h => h.status === 'unhealthy' || h.status === 'error').length} 个软件存在问题，
            请检查兼容性并下载相应的修复文件。
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}

export default SoftwareApiDashboard