import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Bot, 
  Workflow, 
  FileCode, 
  Users, 
  TrendingUp,
  Activity,
  CreditCard
} from 'lucide-react'

export default function Dashboard() {
  const stats = [
    {
      title: 'AI对话',
      value: '1,234',
      change: '+12%',
      icon: Bot,
      color: 'text-blue-600'
    },
    {
      title: '工作流执行',
      value: '856',
      change: '+8%',
      icon: Workflow,
      color: 'text-green-600'
    },
    {
      title: '脚本运行',
      value: '2,456',
      change: '+15%',
      icon: FileCode,
      color: 'text-purple-600'
    },
    {
      title: '活跃用户',
      value: '123',
      change: '+5%',
      icon: Users,
      color: 'text-orange-600'
    }
  ]

  const recentActivities = [
    { id: 1, user: '张三', action: '创建了新工作流', time: '2分钟前' },
    { id: 2, user: '李四', action: '执行了脚本', time: '5分钟前' },
    { id: 3, user: '王五', action: '进行了AI对话', time: '10分钟前' },
    { id: 4, user: '赵六', action: '更新了设置', time: '15分钟前' }
  ]

  return (
    <div className="space-y-6">
      {/* 欢迎区域 */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">欢迎来到 AiDesign</h1>
        <p className="text-lg opacity-90">
          您的智能设计自动化平台 - 让AI助力您的创意工作
        </p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <div className={`flex items-center ${stat.color}`}>
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm">{stat.change}</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 快速操作 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Bot className="mr-2 h-5 w-5" />
              AI助手
            </CardTitle>
            <CardDescription>
              开始与AI助手对话，获得创意灵感
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => window.location.href = '/ai'}>
              开始对话
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Workflow className="mr-2 h-5 w-5" />
              创建工作流
            </CardTitle>
            <CardDescription>
              设计自动化工作流，提升工作效率
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline" onClick={() => window.location.href = '/workflows'}>
              创建工作流
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileCode className="mr-2 h-5 w-5" />
              脚本市场
            </CardTitle>
            <CardDescription>
              浏览和下载常用软件脚本
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline" onClick={() => window.location.href = '/scripts'}>
              浏览脚本
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* 最近活动 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="mr-2 h-5 w-5" />
            最近活动
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivities.map((activity) => (
              <div key={activity.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium">{activity.user}</div>
                  <div className="text-sm text-muted-foreground">{activity.action}</div>
                </div>
                <div className="text-sm text-muted-foreground">{activity.time}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}