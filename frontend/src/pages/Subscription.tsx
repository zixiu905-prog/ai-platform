import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { 
  CreditCard, 
  Check, 
  X, 
  Star, 
  Zap, 
  Crown,
  TrendingUp,
  Package,
  RefreshCw,
  History,
  Download,
  AlertCircle,
  Info,
  ChevronRight,
  ShoppingCart
} from 'lucide-react'

interface SubscriptionPlan {
  id: string
  name: string
  price: {
    monthly: number
    yearly: number
  }
  features: string[]
  limits: {
    aiConversations: number
    workflows: number
    scripts: number
    storage: string
    support: 'basic' | 'priority' | 'dedicated'
  }
  badge?: string
  recommended?: boolean
  tokens: number
}

interface PaymentMethod {
  id: string
  type: 'card' | 'alipay' | 'wechat' | 'bank'
  last4?: string
  brand?: string
  isDefault: boolean
}

interface Transaction {
  id: string
  date: string
  description: string
  amount: number
  status: 'completed' | 'pending' | 'failed'
  type: 'payment' | 'refund' | 'subscription'
}

export default function Subscription() {
  const [selectedPlan, setSelectedPlan] = useState<string>('professional')
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
  const [loading, setLoading] = useState(false)
  const [showPaymentForm, setShowPaymentForm] = useState(false)

  // 订阅计划数据
  const plans: SubscriptionPlan[] = [
    {
      id: 'starter',
      name: '入门版',
      price: {
        monthly: 29,
        yearly: 290
      },
      features: [
        '基础 AI 对话功能',
        '每月 500 次 AI 交互',
        '基础工作流模板',
        '脚本库基础访问',
        '社区支持'
      ],
      limits: {
        aiConversations: 500,
        workflows: 10,
        scripts: 50,
        storage: '1GB',
        support: 'basic'
      },
      tokens: 5000
    },
    {
      id: 'professional',
      name: '专业版',
      price: {
        monthly: 99,
        yearly: 990
      },
      features: [
        '完整 AI 对话功能',
        '无限制 AI 交互',
        '高级工作流编辑器',
        '完整脚本库访问',
        '桌面应用完整功能',
        '优先技术支持',
        '自定义脚本生成',
        '批量处理功能'
      ],
      limits: {
        aiConversations: -1,
        workflows: -1,
        scripts: -1,
        storage: '10GB',
        support: 'priority'
      },
      badge: '最受欢迎',
      recommended: true,
      tokens: 20000
    },
    {
      id: 'enterprise',
      name: '企业版',
      price: {
        monthly: 299,
        yearly: 2990
      },
      features: [
        '专业版所有功能',
        '团队协作功能',
        'API 访问权限',
        '自定义模型训练',
        '专属技术支持',
        'SLA 保障',
        '私有部署选项',
        '数据分析仪表板'
      ],
      limits: {
        aiConversations: -1,
        workflows: -1,
        scripts: -1,
        storage: '100GB',
        support: 'dedicated'
      },
      badge: '企业首选',
      tokens: 100000
    }
  ]

  // 支付方式数据
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([
    {
      id: '1',
      type: 'card',
      last4: '4242',
      brand: 'visa',
      isDefault: true
    },
    {
      id: '2',
      type: 'alipay',
      isDefault: false
    },
    {
      id: '3',
      type: 'wechat',
      isDefault: false
    }
  ])

  // 交易记录数据
  const [transactions, setTransactions] = useState<Transaction[]>([
    {
      id: 'txn_001',
      date: '2024-12-15',
      description: '专业版月度订阅',
      amount: 99,
      status: 'completed',
      type: 'subscription'
    },
    {
      id: 'txn_002',
      date: '2024-12-10',
      description: 'Token 充值 5000',
      amount: 50,
      status: 'completed',
      type: 'payment'
    },
    {
      id: 'txn_003',
      date: '2024-11-15',
      description: '专业版月度订阅',
      amount: 99,
      status: 'completed',
      type: 'subscription'
    }
  ])

  // 当前订阅状态
  const [currentSubscription, setCurrentSubscription] = useState({
    plan: 'professional',
    status: 'active' as 'active' | 'expired' | 'cancelled',
    endDate: '2024-12-15',
    autoRenewal: true,
    tokensRemaining: 12580,
    nextBillingDate: '2024-12-15'
  })

  // Token 充值选项
  const tokenPackages = [
    { amount: 1000, price: 10, bonus: 0 },
    { amount: 5000, price: 45, bonus: 500 },
    { amount: 10000, price: 85, bonus: 1500 },
    { amount: 25000, price: 200, bonus: 5000 },
    { amount: 50000, price: 380, bonus: 12000 }
  ]

  // 处理订阅升级
  const handleSubscribe = async (planId: string) => {
    setLoading(true)
    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const plan = plans.find(p => p.id === planId)
      if (plan) {
        setCurrentSubscription({
          ...currentSubscription,
          plan: planId,
          tokensRemaining: plan.tokens
        })
      }
      
      setShowPaymentForm(false)
    } catch (error) {
      console.error('订阅失败:', error)
    } finally {
      setLoading(false)
    }
  }

  // 处理 Token 充值
  const handleTokenPurchase = async (amount: number, price: number) => {
    setLoading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      const newTransaction: Transaction = {
        id: `txn_${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        description: `Token 充值 ${amount}`,
        amount: price,
        status: 'completed',
        type: 'payment'
      }
      
      setTransactions([newTransaction, ...transactions])
      setCurrentSubscription({
        ...currentSubscription,
        tokensRemaining: currentSubscription.tokensRemaining + amount
      })
    } catch (error) {
      console.error('Token 充值失败:', error)
    } finally {
      setLoading(false)
    }
  }

  // 获取计划图标
  const getPlanIcon = (planId: string) => {
    switch (planId) {
      case 'starter': return <Package className="h-8 w-8" />
      case 'professional': return <Zap className="h-8 w-8" />
      case 'enterprise': return <Crown className="h-8 w-8" />
      default: return <Package className="h-8 w-8" />
    }
  }

  // 格式化价格
  const formatPrice = (price: number, cycle: 'monthly' | 'yearly') => {
    if (cycle === 'yearly') {
      const monthly = price / 12
      return `¥${price}/年 (¥${monthly.toFixed(0)}/月)`
    }
    return `¥${price}/月`
  }

  // 计算折扣
  const calculateDiscount = (monthly: number, yearly: number) => {
    const yearlyMonthly = yearly / 12
    const discount = ((monthly - yearlyMonthly) / monthly) * 100
    return Math.round(discount)
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">订阅管理</h1>
        <p className="text-gray-600">管理您的订阅计划、支付方式和 Token 使用</p>
      </div>

      <Tabs value="plans" onValueChange={(value) => console.log(value)} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="plans">订阅计划</TabsTrigger>
          <TabsTrigger value="tokens">Token 充值</TabsTrigger>
          <TabsTrigger value="billing">账单管理</TabsTrigger>
          <TabsTrigger value="payment">支付方式</TabsTrigger>
        </TabsList>

        {/* 订阅计划标签页 */}
        <TabsContent value="plans" className="space-y-6">
          {/* 当前订阅状态 */}
          <Card>
            <CardHeader>
              <CardTitle>当前订阅</CardTitle>
              <CardDescription>
                您当前的订阅状态和剩余服务时间
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    {getPlanIcon(currentSubscription.plan)}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">
                      {plans.find(p => p.id === currentSubscription.plan)?.name}
                    </h3>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Badge variant={currentSubscription.status === 'active' ? 'default' : 'destructive'}>
                        {currentSubscription.status === 'active' ? '活跃' : '已过期'}
                      </Badge>
                      <span>•</span>
                      <span>剩余 Token: {currentSubscription.tokensRemaining.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">下次续费</p>
                  <p className="font-semibold">{currentSubscription.nextBillingDate}</p>
                </div>
              </div>

              <div className="flex items-center justify-between mt-6 pt-6 border-t">
                <div className="flex items-center space-x-2">
                  <RefreshCw className="h-4 w-4" />
                  <span className="text-sm">自动续费</span>
                </div>
                <Button
                  variant={currentSubscription.autoRenewal ? "default" : "outline"}
                  size="sm"
                >
                  {currentSubscription.autoRenewal ? '已开启' : '已关闭'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 计费周期选择 */}
          <div className="flex justify-center">
            <Card className="p-4">
              <RadioGroup 
                value={billingCycle} 
                onValueChange={(value: string) => setBillingCycle(value as 'monthly' | 'yearly')}
                className="flex space-x-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="monthly" id="monthly" />
                  <Label htmlFor="monthly">月付</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yearly" id="yearly" />
                  <Label htmlFor="yearly">年付</Label>
                  <Badge variant="secondary">省 17%</Badge>
                </div>
              </RadioGroup>
            </Card>
          </div>

          {/* 订阅计划列表 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <Card 
                key={plan.id}
                className={`relative ${plan.recommended ? 'border-blue-500 shadow-lg' : ''}`}
              >
                {plan.recommended && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-blue-500">
                      <Star className="h-3 w-3 mr-1" />
                      {plan.badge}
                    </Badge>
                  </div>
                )}
                
                <CardHeader className="text-center pb-4">
                  <div className="flex justify-center mb-4">
                    {getPlanIcon(plan.id)}
                  </div>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <div className="mt-4">
                    <div className="text-3xl font-bold">
                      {formatPrice(plan.price[billingCycle], billingCycle)}
                    </div>
                    {billingCycle === 'yearly' && (
                      <div className="text-sm text-green-600 mt-1">
                        节省 {calculateDiscount(plan.price.monthly, plan.price.yearly)}%
                      </div>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 mt-2">
                    包含 {plan.tokens.toLocaleString()} Token
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    {plan.features.map((feature, index) => (
                      <div key={index} className="flex items-start space-x-2">
                        <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>AI 对话</span>
                      <span>{plan.limits.aiConversations === -1 ? '无限制' : plan.limits.aiConversations}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>工作流</span>
                      <span>{plan.limits.workflows === -1 ? '无限制' : plan.limits.workflows}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>存储空间</span>
                      <span>{plan.limits.storage}</span>
                    </div>
                  </div>

                  <Button 
                    className="w-full"
                    variant={currentSubscription.plan === plan.id ? "outline" : "default"}
                    disabled={loading}
                    onClick={() => {
                      if (currentSubscription.plan !== plan.id) {
                        setSelectedPlan(plan.id)
                        setShowPaymentForm(true)
                      }
                    }}
                  >
                    {currentSubscription.plan === plan.id ? '当前计划' : '升级到' + plan.name}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Token 充值标签页 */}
        <TabsContent value="tokens" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Token 充值</CardTitle>
              <CardDescription>
                购买更多 Token 来使用 AI 功能，充值越多优惠越大
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tokenPackages.map((pkg, index) => (
                  <Card 
                    key={index}
                    className={`relative ${pkg.bonus > 0 ? 'border-orange-200 bg-orange-50' : ''}`}
                  >
                    {pkg.bonus > 0 && (
                      <div className="absolute -top-2 -right-2">
                        <Badge className="bg-orange-500">
                          +{pkg.bonus} 赠送
                        </Badge>
                      </div>
                    )}
                    <CardContent className="p-6 text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {pkg.amount.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-600 mb-4">Token</div>
                      
                      <div className="text-3xl font-bold mb-1">
                        ¥{pkg.price}
                      </div>
                      <div className="text-sm text-gray-600">
                        约 ¥{(pkg.price / pkg.amount * 1000).toFixed(2)}/千Token
                      </div>
                      
                      {pkg.bonus > 0 && (
                        <div className="text-sm text-orange-600 mt-2 font-medium">
                          实得 {(pkg.amount + pkg.bonus).toLocaleString()} Token
                        </div>
                      )}
                      
                      <Button 
                        className="w-full mt-4"
                        disabled={loading}
                        onClick={() => handleTokenPurchase(pkg.amount + pkg.bonus, pkg.price)}
                      >
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        购买
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <div className="flex items-start space-x-2">
                  <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Token 使用说明：</p>
                    <ul className="space-y-1 text-blue-700">
                      <li>• Token 在所有 AI 功能中通用，包括对话、图像生成、工作流等</li>
                      <li>• Token 永久有效，不会过期</li>
                      <li>• 企业版用户每月自动获得 {plans[2].tokens.toLocaleString()} 免费Token</li>
                      <li>• 支持开具发票，适合企业用户</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 账单管理标签页 */}
        <TabsContent value="billing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>账单历史</CardTitle>
              <CardDescription>
                查看您的订阅和消费记录
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {transactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        {transaction.type === 'subscription' && <RefreshCw className="h-5 w-5" />}
                        {transaction.type === 'payment' && <CreditCard className="h-5 w-5" />}
                        {transaction.type === 'refund' && <TrendingUp className="h-5 w-5" />}
                      </div>
                      <div>
                        <p className="font-medium">{transaction.description}</p>
                        <p className="text-sm text-gray-600">{transaction.date}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">
                        {transaction.type === 'refund' ? '+' : '¥'}{transaction.amount}
                      </div>
                      <Badge 
                        variant={
                          transaction.status === 'completed' ? 'default' :
                          transaction.status === 'pending' ? 'secondary' : 'destructive'
                        }
                      >
                        {transaction.status === 'completed' ? '已完成' :
                         transaction.status === 'pending' ? '处理中' : '失败'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-center mt-6">
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  下载账单
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 支付方式标签页 */}
        <TabsContent value="payment" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>支付方式</CardTitle>
              <CardDescription>
                管理您的支付方式和账单信息
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {paymentMethods.map((method) => (
                <div key={method.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      {method.type === 'card' && <CreditCard className="h-5 w-5" />}
                      {method.type === 'alipay' && <div className="text-blue-600 font-bold text-xs">支付宝</div>}
                      {method.type === 'wechat' && <div className="text-green-600 font-bold text-xs">微信</div>}
                    </div>
                    <div>
                      <p className="font-medium">
                        {method.type === 'card' && `${method.brand?.toUpperCase()} •••• ${method.last4}`}
                        {method.type === 'alipay' && '支付宝支付'}
                        {method.type === 'wechat' && '微信支付'}
                      </p>
                      {method.isDefault && (
                        <Badge variant="secondary" className="mt-1">默认支付方式</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {!method.isDefault && (
                      <Button variant="outline" size="sm">设为默认</Button>
                    )}
                    <Button variant="outline" size="sm">删除</Button>
                  </div>
                </div>
              ))}

              <Button className="w-full" variant="outline">
                <CreditCard className="h-4 w-4 mr-2" />
                添加支付方式
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 支付表单模态框 */}
      {showPaymentForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>确认订阅</CardTitle>
              <CardDescription>
                您正在订阅 {plans.find(p => p.id === selectedPlan)?.name}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span>计划</span>
                  <span className="font-medium">{plans.find(p => p.id === selectedPlan)?.name}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span>价格</span>
                  <span className="font-medium">
                    {formatPrice(plans.find(p => p.id === selectedPlan)?.price[billingCycle] || 0, billingCycle)}
                  </span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span>Token</span>
                  <span className="font-medium">
                    {plans.find(p => p.id === selectedPlan)?.tokens.toLocaleString()}
                  </span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between items-center font-semibold">
                  <span>总计</span>
                  <span>
                    ¥{plans.find(p => p.id === selectedPlan)?.price[billingCycle]}
                  </span>
                </div>
              </div>

              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setShowPaymentForm(false)}
                  disabled={loading}
                >
                  取消
                </Button>
                <Button 
                  className="flex-1"
                  disabled={loading}
                  onClick={() => handleSubscribe(selectedPlan)}
                >
                  {loading ? '处理中...' : '确认支付'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}