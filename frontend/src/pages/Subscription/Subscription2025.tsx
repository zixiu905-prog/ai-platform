import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Check, X, Star, Zap, Shield, Crown, Users, Gift } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number;
  durationDays: number;
  features: {
    tokensIncluded: number;
    imagesIncluded: number;
    aiModels: string[];
    features: string[];
    supportType: 'community' | 'email' | 'priority' | 'dedicated';
    maxWorkflows: number | 'unlimited';
    maxScripts: number | 'unlimited';
    storageSpace: string;
    excessTokensPrice?: number;
    excessImagesPrice?: number;
    apiAccess?: boolean;
    slaLevel?: 'basic' | 'standard' | 'premium';
    privateDeployment?: boolean;
    customTraining?: boolean;
    multiTenant?: boolean;
    discount?: number;
  };
  maxTokens: number;
  maxImages: number;
  aiModels: string[];
  isActive: boolean;
}

interface ModelPricing {
  id: string;
  model: string;
  provider: string;
  modelType: string;
  inputPricePerK: number;
  outputPricePerK: number;
  maxTokens: number;
  features: any;
}

const Subscription2025: React.FC = () => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [models, setModels] = useState<ModelPricing[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [showComparison, setShowComparison] = useState(false);
  const [userTokens, setUserTokens] = useState('10000000');
  const [userImages, setUserImages] = useState('100');
  const [activeTab, setActiveTab] = useState('text');
  const navigate = useNavigate();

  useEffect(() => {
    fetchPlans();
    fetchModels();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await fetch('/api/subscription-2025/plans', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (data.success) {
        setPlans(data.data);
      }
    } catch (error) {
      console.error('获取订阅计划失败:', error);
      toast.error('获取订阅计划失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchModels = async () => {
    try {
      const response = await fetch('/api/subscription-2025/models', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (data.success) {
        setModels(data.data);
      }
    } catch (error) {
      console.error('获取模型列表失败:', error);
    }
  };

  const handleSubscribe = async (plan: SubscriptionPlan, paymentMethod: string) => {
    try {
      setLoading(true);
      const response = await fetch('/api/subscription-2025/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          planId: plan.id,
          paymentMethod,
          isAutoRenewal: true
        })
      });

      const data = await response.json();
      if (data.success && data.data.paymentUrl) {
        // 跳转到支付页面
        window.open(data.data.paymentUrl, '_blank');
        toast.success('正在跳转到支付页面...');
      } else {
        toast.error(data.message || '创建订阅失败');
      }
    } catch (error) {
      console.error('创建订阅失败:', error);
      toast.error('创建订阅失败');
    } finally {
      setLoading(false);
    }
  };

  const formatTokens = (tokens: number): string => {
    if (tokens >= 1000000) {
      return `${(tokens / 1000000).toFixed(1)}M`;
    } else if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(1)}K`;
    }
    return tokens.toString();
  };

  const getPlanIcon = (planName: string) => {
    if (planName.includes('免费')) return <Gift className="w-6 h-6 text-gray-500" />;
    if (planName.includes('基础')) return <Zap className="w-6 h-6 text-blue-500" />;
    if (planName.includes('专业')) return <Star className="w-6 h-6 text-purple-500" />;
    if (planName.includes('企业')) return <Crown className="w-6 h-6 text-orange-500" />;
    return <Shield className="w-6 h-6" />;
  };

  const getPopularBadge = (planName: string) => {
    if (planName.includes('基础')) {
      return <Badge className="absolute -top-2 -right-2 bg-blue-500 text-white">最受欢迎</Badge>;
    }
    if (planName.includes('企业')) {
      return <Badge className="absolute -top-2 -right-2 bg-orange-500 text-white">企业首选</Badge>;
    }
    return null;
  };

  const filteredPlans = plans.filter(plan => {
    const isYearly = plan.duration > 1;
    return billingCycle === 'monthly' ? !isYearly : isYearly;
  });

  const calculateSavings = (plan: SubscriptionPlan) => {
    if (!plan.features.discount) return null;
    const monthlyPlan = plans.find(p => 
      p.name.includes(plan.name.split(' ')[0]) && p.duration === 1
    );
    if (!monthlyPlan) return null;
    const yearlyMonthlyPrice = plan.price / 12;
    const savings = ((monthlyPlan.price - yearlyMonthlyPrice) / monthlyPlan.price) * 100;
    return savings.toFixed(0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* 头部 */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            2025年AI设计平台订阅计划
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            价格降90%，价值翻10倍！拥抱AI普惠时代
          </p>
          
          {/* 计费周期切换 */}
          <div className="flex items-center justify-center space-x-4 mb-8">
            <span className={`font-medium ${billingCycle === 'monthly' ? 'text-blue-600' : 'text-gray-500'}`}>
              月付
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
              className="rounded-full"
            >
              {billingCycle === 'monthly' ? '年付' : '月付'}
            </Button>
            <span className={`font-medium ${billingCycle === 'yearly' ? 'text-blue-600' : 'text-gray-500'}`}>
              年付 (省20%)
            </span>
          </div>
        </div>

        {/* 订阅计划卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {filteredPlans.map((plan) => (
            <Card key={plan.id} className={`relative ${plan.name.includes('专业') ? 'ring-2 ring-purple-500 transform scale-105' : ''}`}>
              {getPopularBadge(plan.name)}
              <CardHeader className="text-center pb-4">
                <div className="flex justify-center mb-2">
                  {getPlanIcon(plan.name)}
                </div>
                <CardTitle className="text-xl font-bold">{plan.name}</CardTitle>
                <CardDescription className="text-sm text-gray-600">
                  {plan.description}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="text-center">
                <div className="mb-6">
                  <span className="text-4xl font-bold text-blue-600">¥{plan.price}</span>
                  <span className="text-gray-500">/{plan.duration > 1 ? '年' : '月'}</span>
                </div>

                {calculateSavings(plan) && (
                  <div className="mb-4">
                    <Badge className="bg-green-100 text-green-800">
                      节省 {calculateSavings(plan)}%
                    </Badge>
                  </div>
                )}

                <div className="space-y-3 text-left mb-6">
                  <div className="flex items-center">
                    <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                    <span className="text-sm">{formatTokens(plan.maxTokens)} tokens/月</span>
                  </div>
                  
                  {plan.maxImages > 0 ? (
                    <div className="flex items-center">
                      <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                      <span className="text-sm">{plan.maxImages} 张图像生成/月</span>
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                      <span className="text-sm">无限图像生成</span>
                    </div>
                  )}

                  <div className="flex items-center">
                    <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                    <span className="text-sm">{plan.aiModels.length}+ AI模型</span>
                  </div>

                  {plan.features.features.slice(0, 3).map((feature, index) => (
                    <div key={index} className="flex items-center">
                      <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}

                  <div className="flex items-center">
                    <Users className="w-4 h-4 text-blue-500 mr-2 flex-shrink-0" />
                    <span className="text-sm">
                      {plan.features.supportType === 'community' && '社区支持'}
                      {plan.features.supportType === 'email' && '邮件支持'}
                      {plan.features.supportType === 'priority' && '优先支持'}
                      {plan.features.supportType === 'dedicated' && '专属支持'}
                    </span>
                  </div>
                </div>
              </CardContent>

              <CardFooter>
                <Button 
                  className="w-full"
                  variant={plan.name.includes('基础') ? 'default' : 'outline'}
                  onClick={() => {
                    setSelectedPlan(plan);
                    handleSubscribe(plan, 'WECHAT_NATIVE');
                  }}
                  disabled={loading}
                >
                  {plan.name.includes('免费') ? '立即免费使用' : '立即订阅'}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* 功能对比表 */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">功能对比</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4">功能</th>
                    <th className="text-center p-4">免费版</th>
                    <th className="text-center p-4">基础版</th>
                    <th className="text-center p-4">专业版</th>
                    <th className="text-center p-4">企业版</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="p-4 font-medium">价格</td>
                    <td className="text-center p-4">¥0/月</td>
                    <td className="text-center p-4">¥19/月</td>
                    <td className="text-center p-4">¥69/月</td>
                    <td className="text-center p-4">¥299/月</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-4 font-medium">Token配额</td>
                    <td className="text-center p-4">1M</td>
                    <td className="text-center p-4">20M</td>
                    <td className="text-center p-4">100M</td>
                    <td className="text-center p-4">500M</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-4 font-medium">图像生成</td>
                    <td className="text-center p-4">50张</td>
                    <td className="text-center p-4">300张</td>
                    <td className="text-center p-4">1500张</td>
                    <td className="text-center p-4">无限</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-4 font-medium">AI模型</td>
                    <td className="text-center p-4">基础</td>
                    <td className="text-center p-4">中级</td>
                    <td className="text-center p-4">高级</td>
                    <td className="text-center p-4">全部</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-4 font-medium">API访问</td>
                    <td className="text-center p-4"><X className="w-5 h-5 text-red-500 mx-auto" /></td>
                    <td className="text-center p-4"><X className="w-5 h-5 text-red-500 mx-auto" /></td>
                    <td className="text-center p-4"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                    <td className="text-center p-4"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-4 font-medium">私有部署</td>
                    <td className="text-center p-4"><X className="w-5 h-5 text-red-500 mx-auto" /></td>
                    <td className="text-center p-4"><X className="w-5 h-5 text-red-500 mx-auto" /></td>
                    <td className="text-center p-4"><X className="w-5 h-5 text-red-500 mx-auto" /></td>
                    <td className="text-center p-4"><Check className="w-5 h-5 text-green-500 mx-auto" /></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* AI模型价格展示 */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">2025年最新AI模型价格</CardTitle>
            <CardDescription className="text-center">
              价格已进入"厘时代"，成本降低90%+
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="text">文本模型</TabsTrigger>
                <TabsTrigger value="vision">视觉模型</TabsTrigger>
                <TabsTrigger value="image">图像生成</TabsTrigger>
              </TabsList>
              
              <TabsContent value="text" className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {models.filter(m => m.modelType === 'text').map((model) => (
                    <div key={model.id} className="border rounded-lg p-4">
                      <h4 className="font-semibold mb-2">{model.model}</h4>
                      <p className="text-sm text-gray-600 mb-2">{model.provider}</p>
                      <div className="text-sm">
                        <div>输入: ¥{model.inputPricePerK}/千tokens</div>
                        <div>输出: ¥{model.outputPricePerK}/千tokens</div>
                        <div className="text-xs text-gray-500 mt-1">
                          最大: {formatTokens(model.maxTokens)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
              
              <TabsContent value="vision" className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {models.filter(m => m.modelType === 'vision').map((model) => (
                    <div key={model.id} className="border rounded-lg p-4">
                      <h4 className="font-semibold mb-2">{model.model}</h4>
                      <p className="text-sm text-gray-600 mb-2">{model.provider}</p>
                      <div className="text-sm">
                        <div>输入: ¥{model.inputPricePerK}/千tokens</div>
                        <div>输出: ¥{model.outputPricePerK}/千tokens</div>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
              
              <TabsContent value="image" className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {models.filter(m => m.modelType === 'image').map((model) => (
                    <div key={model.id} className="border rounded-lg p-4">
                      <h4 className="font-semibold mb-2">{model.model}</h4>
                      <p className="text-sm text-gray-600 mb-2">{model.provider}</p>
                      <div className="text-sm">
                        <div>价格: ¥{model.inputPricePerK}/张</div>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* 价格对比工具 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">个性化价格对比</CardTitle>
            <CardDescription className="text-center">
              输入您的预估使用量，找到最适合的方案
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium mb-2">预估月Token使用量</label>
                <input
                  type="number"
                  value={userTokens}
                  onChange={(e) => setUserTokens(e.target.value)}
                  className="w-full p-2 border rounded"
                  placeholder="10000000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">预估月图像生成量</label>
                <input
                  type="number"
                  value={userImages}
                  onChange={(e) => setUserImages(e.target.value)}
                  className="w-full p-2 border rounded"
                  placeholder="100"
                />
              </div>
            </div>
            
            <Button 
              onClick={() => setShowComparison(!showComparison)}
              className="w-full mb-6"
            >
              {showComparison ? '隐藏对比' : '开始对比'}
            </Button>

            {showComparison && (
              <div className="space-y-4">
                {plans.map((plan) => {
                  const totalTokens = Math.max(0, parseInt(userTokens));
                  const totalImages = Math.max(0, parseInt(userImages));
                  
                  let totalCost = plan.price;
                  let excessTokens = 0;
                  let excessImages = 0;

                  if (plan.maxTokens > 0 && totalTokens > plan.maxTokens) {
                    excessTokens = totalTokens - plan.maxTokens;
                    totalCost += (excessTokens / 1000) * (plan.features.excessTokensPrice || 0.01);
                  }

                  if (plan.maxImages > 0 && totalImages > plan.maxImages) {
                    excessImages = totalImages - plan.maxImages;
                    totalCost += excessImages * (plan.features.excessImagesPrice || 0.02);
                  }

                  return (
                    <div key={plan.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold">{plan.name}</h4>
                          <p className="text-sm text-gray-600">
                            基础价格: ¥{plan.price}
                            {excessTokens > 0 && (
                              <span className="text-red-500">
                                + 超额Tokens: {(excessTokens / 1000).toFixed(1)}K × ¥{(plan.features.excessTokensPrice || 0.01)}
                              </span>
                            )}
                            {excessImages > 0 && (
                              <span className="text-red-500">
                                + 超额图片: {excessImages} × ¥{(plan.features.excessImagesPrice || 0.02)}
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold text-blue-600">
                            ¥{totalCost.toFixed(2)}
                          </div>
                          <div className="text-sm text-gray-500">
                            ¥{(totalCost / (totalTokens / 1000000)).toFixed(4)} /百万tokens
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Subscription2025;