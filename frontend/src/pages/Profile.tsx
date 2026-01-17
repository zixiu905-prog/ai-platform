import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  User,
  Mail,
  Phone,
  Calendar,
  CreditCard,
  Settings,
  Shield,
  Bell,
  LogOut,
  Edit2,
  Save,
  X,
  Check,
  AlertCircle,
  Download,
  Clock,
  TrendingUp,
  Upload,
  Bot,
  Workflow,
  FileCode
} from 'lucide-react'

export default function Profile() {
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [activeTab, setActiveTab] = useState('profile')
  
  // 用户数据状态
  const [userData, setUserData] = useState({
    name: '张三',
    email: 'zhangsan@example.com',
    phone: '+86 138-0013-8000',
    avatar: '',
    bio: '我是一名专业的UI设计师，热爱创新和美学。',
    location: '北京市',
    website: 'https://zhangsan.design',
    birthdate: '1990-01-01',
    company: '创意设计工作室',
    jobTitle: '高级UI设计师'
  })

  // 订阅信息
  const [subscriptionData, setSubscriptionData] = useState({
    plan: '专业版',
    status: 'active' as 'active' | 'expired' | 'trial',
    startDate: '2024-01-15',
    endDate: '2024-12-15',
    autoRenewal: true,
    monthlyPrice: 99,
    yearlyPrice: 990,
    tokensRemaining: 12580,
    tokensUsed: 3420,
    features: [
      '无限制AI对话',
      '高级工作流功能',
      '脚本库访问',
      '优先技术支持',
      '桌面应用完整功能'
    ]
  })

  // 使用统计
  const [usageStats, setUsageStats] = useState({
    totalAIConversations: 1234,
    totalWorkflows: 56,
    totalScripts: 234,
    totalTokensUsed: 3420,
    monthlySavings: 1280,
    efficiency: 85
  })

  // 安全设置
  const [securitySettings, setSecuritySettings] = useState({
    twoFactorEnabled: false,
    emailNotifications: true,
    smsNotifications: false,
    loginAlerts: true,
    sessionTimeout: 24
  })

  // 通知设置
  const [notificationSettings, setNotificationSettings] = useState({
    emailUpdates: true,
    productUpdates: false,
    marketingEmails: false,
    securityAlerts: true,
    subscriptionAlerts: true,
    newsletter: true
  })

  // 保存用户信息
  const handleSaveProfile = async () => {
    setLoading(true)
    setSaveStatus('saving')
    
    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setIsEditing(false)
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (error) {
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } finally {
      setLoading(false)
    }
  }

  // 取消编辑
  const handleCancelEdit = () => {
    setIsEditing(false)
    // 重置为原始数据
  }

  // 格式化日期
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  // 计算剩余天数
  const getDaysRemaining = () => {
    const endDate = new Date(subscriptionData.endDate)
    const today = new Date()
    const diffTime = endDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return Math.max(0, diffDays)
  }

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500'
      case 'trial': return 'bg-blue-500'
      case 'expired': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  // 获取状态文本
  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return '活跃'
      case 'trial': return '试用'
      case 'expired': return '已过期'
      default: return '未知'
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">个人中心</h1>
        <p className="text-gray-600">管理您的账户信息、订阅和使用统计</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="profile">个人信息</TabsTrigger>
          <TabsTrigger value="subscription">订阅管理</TabsTrigger>
          <TabsTrigger value="usage">使用统计</TabsTrigger>
          <TabsTrigger value="security">安全设置</TabsTrigger>
          <TabsTrigger value="notifications">通知设置</TabsTrigger>
        </TabsList>

        {/* 个人信息标签页 */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  基本信息
                </CardTitle>
                {!isEditing && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    编辑
                  </Button>
                )}
              </div>
              <CardDescription>
                管理您的个人资料信息
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={userData.avatar} alt={userData.name} />
                  <AvatarFallback>{userData.name.slice(0, 2)}</AvatarFallback>
                </Avatar>
                {isEditing && (
                  <div>
                    <Button variant="outline" size="sm">
                      <Upload className="h-4 w-4 mr-2" />
                      上传头像
                    </Button>
                    <p className="text-sm text-gray-500 mt-1">
                      支持 JPG, PNG 格式，最大 2MB
                    </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">姓名</Label>
                  <Input
                    id="name"
                    value={userData.name}
                    onChange={(e) => setUserData({...userData, name: e.target.value})}
                    disabled={!isEditing}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">邮箱</Label>
                  <Input
                    id="email"
                    type="email"
                    value={userData.email}
                    onChange={(e) => setUserData({...userData, email: e.target.value})}
                    disabled={!isEditing}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">电话</Label>
                  <Input
                    id="phone"
                    value={userData.phone}
                    onChange={(e) => setUserData({...userData, phone: e.target.value})}
                    disabled={!isEditing}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">位置</Label>
                  <Input
                    id="location"
                    value={userData.location}
                    onChange={(e) => setUserData({...userData, location: e.target.value})}
                    disabled={!isEditing}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company">公司</Label>
                  <Input
                    id="company"
                    value={userData.company}
                    onChange={(e) => setUserData({...userData, company: e.target.value})}
                    disabled={!isEditing}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="jobTitle">职位</Label>
                  <Input
                    id="jobTitle"
                    value={userData.jobTitle}
                    onChange={(e) => setUserData({...userData, jobTitle: e.target.value})}
                    disabled={!isEditing}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website">个人网站</Label>
                  <Input
                    id="website"
                    value={userData.website}
                    onChange={(e) => setUserData({...userData, website: e.target.value})}
                    disabled={!isEditing}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="birthdate">生日</Label>
                  <Input
                    id="birthdate"
                    type="date"
                    value={userData.birthdate}
                    onChange={(e) => setUserData({...userData, birthdate: e.target.value})}
                    disabled={!isEditing}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">个人简介</Label>
                <textarea
                  id="bio"
                  className="w-full min-h-[100px] p-3 border border-gray-300 rounded-md resize-none"
                  value={userData.bio}
                  onChange={(e) => setUserData({...userData, bio: e.target.value})}
                  disabled={!isEditing}
                  placeholder="介绍一下您自己..."
                />
              </div>

              {isEditing && (
                <div className="flex items-center gap-2 pt-4">
                  <Button onClick={handleSaveProfile} disabled={loading}>
                    <Save className="h-4 w-4 mr-2" />
                    {loading ? '保存中...' : '保存'}
                  </Button>
                  <Button variant="outline" onClick={handleCancelEdit}>
                    <X className="h-4 w-4 mr-2" />
                    取消
                  </Button>
                  {saveStatus === 'saved' && (
                    <span className="text-green-600 text-sm flex items-center">
                      <Check className="h-4 w-4 mr-1" />
                      保存成功
                    </span>
                  )}
                  {saveStatus === 'error' && (
                    <span className="text-red-600 text-sm flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      保存失败
                    </span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 订阅管理标签页 */}
        <TabsContent value="subscription" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  当前订阅
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold">{subscriptionData.plan}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <div className={`w-2 h-2 rounded-full ${getStatusColor(subscriptionData.status)}`} />
                      <span className="text-sm text-gray-600">
                        {getStatusText(subscriptionData.status)}
                      </span>
                      <Separator orientation="vertical" className="h-4" />
                      <span className="text-sm text-gray-600">
                        剩余 {getDaysRemaining()} 天
                      </span>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-lg px-4 py-2">
                    ¥{subscriptionData.monthlyPrice}/月
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">开始时间</p>
                    <p className="font-medium">{formatDate(subscriptionData.startDate)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">到期时间</p>
                    <p className="font-medium">{formatDate(subscriptionData.endDate)}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium">订阅特权</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {subscriptionData.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">自动续费</p>
                    <p className="text-sm text-gray-600">到期后自动续费，避免服务中断</p>
                  </div>
                  <Button
                    variant={subscriptionData.autoRenewal ? "default" : "outline"}
                    size="sm"
                  >
                    {subscriptionData.autoRenewal ? '已开启' : '开启'}
                  </Button>
                </div>

                <div className="flex gap-2">
                  <Button>升级订阅</Button>
                  <Button variant="outline">管理支付方式</Button>
                  <Button variant="outline">下载发票</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Token 使用
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    {subscriptionData.tokensRemaining.toLocaleString()}
                  </div>
                  <p className="text-sm text-gray-600">剩余 Token</p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>已使用</span>
                    <span>{subscriptionData.tokensUsed.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>剩余</span>
                    <span>{subscriptionData.tokensRemaining.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full"
                      style={{
                        width: `${(subscriptionData.tokensRemaining / (subscriptionData.tokensRemaining + subscriptionData.tokensUsed)) * 100}%`
                      }}
                    />
                  </div>
                </div>

                <Button className="w-full" variant="outline">
                  购买更多 Token
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 使用统计标签页 */}
        <TabsContent value="usage" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">AI 对话</p>
                    <p className="text-2xl font-bold">{usageStats.totalAIConversations}</p>
                  </div>
                  <Bot className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">工作流</p>
                    <p className="text-2xl font-bold">{usageStats.totalWorkflows}</p>
                  </div>
                  <Workflow className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">脚本执行</p>
                    <p className="text-2xl font-bold">{usageStats.totalScripts}</p>
                  </div>
                  <FileCode className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">效率提升</p>
                    <p className="text-2xl font-bold">{usageStats.efficiency}%</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>月度效率分析</CardTitle>
              <CardDescription>
                使用 AiDesign 提升工作效率的分析报告
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium">时间节省</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm">自动生成脚本</span>
                        <span className="text-sm font-medium">节省 45 小时</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">工作流自动化</span>
                        <span className="text-sm font-medium">节省 32 小时</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">AI 辅助设计</span>
                        <span className="text-sm font-medium">节省 28 小时</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">重复任务自动化</span>
                        <span className="text-sm font-medium">节省 23 小时</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium">成本节省</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm">人力成本</span>
                        <span className="text-sm font-medium">¥{usageStats.monthlySavings}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">时间价值</span>
                        <span className="text-sm font-medium">¥2,340</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">工具订阅费</span>
                        <span className="text-sm font-medium">¥-99</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-bold">净节省</span>
                        <span className="text-sm font-bold text-green-600">¥{usageStats.monthlySavings - 99}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-center">
                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    下载详细报告
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 安全设置标签页 */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                安全设置
              </CardTitle>
              <CardDescription>
                管理您的账户安全和隐私设置
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-medium">双重身份验证</h4>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">2FA 验证</p>
                    <p className="text-sm text-gray-600">
                      为您的账户添加额外的安全层
                    </p>
                  </div>
                  <Button
                    variant={securitySettings.twoFactorEnabled ? "default" : "outline"}
                  >
                    {securitySettings.twoFactorEnabled ? '已启用' : '启用 2FA'}
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">登录安全</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">登录提醒</p>
                      <p className="text-sm text-gray-600">新设备登录时通知</p>
                    </div>
                    <Button
                      variant={securitySettings.loginAlerts ? "default" : "outline"}
                      size="sm"
                    >
                      {securitySettings.loginAlerts ? '已开启' : '关闭'}
                    </Button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">会话超时</p>
                      <p className="text-sm text-gray-600">{securitySettings.sessionTimeout} 小时</p>
                    </div>
                    <Button variant="outline" size="sm">
                      修改
                    </Button>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium">密码管理</h4>
                <div className="space-y-3">
                  <Button variant="outline">修改密码</Button>
                  <Button variant="outline">查看登录历史</Button>
                  <Button variant="outline" className="text-red-600">
                    登出所有设备
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 通知设置标签页 */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                通知偏好
              </CardTitle>
              <CardDescription>
                选择您希望接收的通知类型和方式
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-medium">邮件通知</h4>
                <div className="space-y-3">
                  {[
                    { key: 'emailUpdates', label: '账户更新', desc: '重要账户信息变更' },
                    { key: 'productUpdates', label: '产品更新', desc: '新功能和改进' },
                    { key: 'marketingEmails', label: '营销邮件', desc: '优惠和促销信息' },
                    { key: 'securityAlerts', label: '安全提醒', desc: '安全事件和登录提醒' },
                    { key: 'subscriptionAlerts', label: '订阅提醒', desc: '续费和到期提醒' },
                    { key: 'newsletter', label: '新闻通讯', desc: '定期产品新闻和技巧' }
                  ].map(({ key, label, desc }) => (
                    <div key={key} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{label}</p>
                        <p className="text-sm text-gray-600">{desc}</p>
                      </div>
                      <Button
                        variant={notificationSettings[key as keyof typeof notificationSettings] ? "default" : "outline"}
                        size="sm"
                        onClick={() => setNotificationSettings({
                          ...notificationSettings,
                          [key]: !notificationSettings[key as keyof typeof notificationSettings]
                        })}
                      >
                        {notificationSettings[key as keyof typeof notificationSettings] ? '已开启' : '关闭'}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium">通知频率</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button variant="outline">即时通知</Button>
                  <Button variant="outline">每日汇总</Button>
                  <Button variant="outline">每周汇总</Button>
                </div>
              </div>

              <div className="flex justify-end">
                <Button>保存通知设置</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}